import {
	toDeviceAuthenticated,
	type ClientAuthentication,
	type DeviceAuthenticated,
	uncontrolledAuthentication
} from '@judgesroom.com/protocol/src/access';
import type { Network } from '@judgesroom.com/wrpc/server/types';
import type { DrizzleSqliteDODatabase } from 'drizzle-orm/durable-sqlite';
import { metadata } from '../db/schema';
import { resolveClientAuthentication } from '../access/tokens';

export type WsAttachment = {
	roomId: string;
	clientId: string;
	deviceId: string;
	deviceName: string;
	authentication: ClientAuthentication;
};

export type ClientAuthenticationEntry = {
	clientId: string;
	deviceId: string;
	authentication: ClientAuthentication;
};

export type JudgesRoomNetworkOptions = {
	inner: Network;
	db: DrizzleSqliteDODatabase;
	getWebSockets: () => readonly WebSocket[];
};

/**
 * Room-scoped network: wraps the WRPC connection manager with DO websocket + DB access.
 */
export class JudgesRoomNetwork implements Network {
	constructor(private readonly opts: JudgesRoomNetworkOptions) {}

	sendToClient(...args: Parameters<Network['sendToClient']>): ReturnType<Network['sendToClient']> {
		return this.opts.inner.sendToClient(...args);
	}

	broadcast(...args: Parameters<Network['broadcast']>): ReturnType<Network['broadcast']> {
		return this.opts.inner.broadcast(...args);
	}

	getConnectedClients(): Readonly<string[]> {
		return this.opts.inner.getConnectedClients();
	}

	isClientConnected(clientId: string): boolean {
		return this.opts.inner.isClientConnected(clientId);
	}

	isDeviceConnected(deviceId: string): boolean {
		return this.opts.inner.isDeviceConnected(deviceId);
	}

	getAllClientData() {
		return this.opts.inner.getAllClientData();
	}

	getClientData(clientId: string) {
		return this.opts.inner.getClientData(clientId);
	}

	kickClient(clientId: string): Promise<void> {
		return this.opts.inner.kickClient(clientId);
	}

	destroy(): Promise<void> {
		return this.opts.inner.destroy();
	}

	async isAccessControlEnabled(): Promise<boolean> {
		const rows = await this.opts.db.select({ accessControlEnabled: metadata.accessControlEnabled }).from(metadata).limit(1);
		return rows[0]?.accessControlEnabled ?? false;
	}

	/**
	 * Gate WebSocket accept and return the attachment authentication to persist.
	 * Empty room (create path) and AC-off always allow with uncontrolled auth.
	 * When AC is on, auth must resolve to a controlled ClientAuthentication.
	 *
	 * Together with kicking all other clients when AC is toggled (essential.ts), this is
	 * what guarantees no uncontrolled socket exists while AC is on — mutation handlers
	 * rely on that and do not re-check requireAuthenticated.
	 */
	async authorizeConnect(
		auth: string | null
	): Promise<{ allowed: true; authentication: ClientAuthentication } | { allowed: false; response: Response }> {
		// Empty room (create path): no Metadata yet — allow connect; createJudgesRoom mints JA auth.
		if (!(await this.isAccessControlEnabled())) {
			return { allowed: true, authentication: uncontrolledAuthentication };
		}
		if (!auth) {
			return { allowed: false, response: new Response('Access link required', { status: 401 }) };
		}
		const authentication = await resolveClientAuthentication(this.opts.db, auth);
		if (!authentication) {
			return { allowed: false, response: new Response('Invalid or expired access link', { status: 401 }) };
		}
		return { allowed: true, authentication };
	}

	getAllClientAuthentications(): readonly ClientAuthenticationEntry[] {
		const entries: ClientAuthenticationEntry[] = [];
		for (const ws of this.opts.getWebSockets()) {
			const attachment = ws.deserializeAttachment() as WsAttachment | null;
			if (!attachment) continue;
			entries.push({
				clientId: attachment.clientId,
				deviceId: attachment.deviceId,
				authentication: attachment.authentication ?? uncontrolledAuthentication
			});
		}
		return entries;
	}

	/** Live deviceId → public authenticated role from WS attachments (online sockets only). */
	getAllAuthenticatedDevices(): Map<string, DeviceAuthenticated> {
		const roles = new Map<string, DeviceAuthenticated>();
		for (const entry of this.getAllClientAuthentications()) {
			const authenticated = toDeviceAuthenticated(entry.authentication);
			if (authenticated) {
				roles.set(entry.deviceId, authenticated);
			}
		}
		return roles;
	}

	async kickClientsWhere(predicate: (entry: ClientAuthenticationEntry) => boolean): Promise<void> {
		for (const entry of this.getAllClientAuthentications()) {
			if (predicate(entry)) {
				await this.kickClient(entry.clientId);
			}
		}
	}
}
