import {
	type ClientAuthentication,
	uncontrolledAuthentication,
	clientAuthenticationsEqual,
	ConnectAuthCloseReason,
	type ConnectAuthCloseReason as ConnectAuthCloseReasonValue
} from '@judgesroom.com/protocol/src/access';
import type { Network } from '@judgesroom.com/wrpc/server/types';
import type { DrizzleSqliteDODatabase } from 'drizzle-orm/durable-sqlite';
import { metadata, offlineDevices } from '../db/schema';
import { resolveClientAuthentication } from '../access/tokens';
import { eq, inArray, ne } from 'drizzle-orm';

export type ConnectAuthDenial = {
	allowed: false;
	reason: ConnectAuthCloseReasonValue;
};

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

	async kickClient(clientId: string): Promise<void> {
		const client = this.getClientData(clientId);
		await this.opts.inner.kickClient(clientId);
		if (client && !this.isDeviceConnected(client.deviceId)) {
			await this.opts.db.delete(offlineDevices).where(eq(offlineDevices.deviceId, client.deviceId));
		}
	}

	async kickOtherClients(exceptClientId: string): Promise<void> {
		const except = this.getClientData(exceptClientId);
		for (const client of this.getAllClientData()) {
			if (client.clientId !== exceptClientId) {
				await this.opts.inner.kickClient(client.clientId);
			}
		}
		if (except) {
			await this.opts.db.delete(offlineDevices).where(ne(offlineDevices.deviceId, except.deviceId));
		} else {
			await this.opts.db.delete(offlineDevices);
		}
	}

	async kickDevice(deviceId: string): Promise<void> {
		if (this.isDeviceConnected(deviceId)) {
			for (const client of this.getAllClientData()) {
				if (client.deviceId === deviceId) {
					await this.opts.inner.kickClient(client.clientId);
				}
			}
		}
		await this.opts.db.delete(offlineDevices).where(eq(offlineDevices.deviceId, deviceId));
	}

	async kickJudge(judgeId: string): Promise<void> {
		const kickingDevices = new Set<string>();
		for (const ca of this.getAllClientAuthentications()) {
			if (ca.authentication.isAccessControlled && ca.authentication.role === 'judge' && ca.authentication.judgeId === judgeId) {
				kickingDevices.add(ca.deviceId);
				await this.opts.inner.kickClient(ca.clientId);
			}
		}
		if (kickingDevices.size === 0) {
			return;
		}
		await this.opts.db.delete(offlineDevices).where(inArray(offlineDevices.deviceId, Array.from(kickingDevices)));
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
		deviceId: string,
		auth: string | null
	): Promise<{ allowed: true; authentication: ClientAuthentication } | ConnectAuthDenial> {
		// Empty room (create path): no Metadata yet — allow connect; createJudgesRoom mints JA auth.
		if (!(await this.isAccessControlEnabled())) {
			return { allowed: true, authentication: uncontrolledAuthentication };
		}
		if (!auth) {
			return { allowed: false, reason: ConnectAuthCloseReason.ACCESS_LINK_REQUIRED };
		}
		const authentication = await resolveClientAuthentication(this.opts.db, auth);
		if (!authentication) {
			return { allowed: false, reason: ConnectAuthCloseReason.INVALID_ACCESS_LINK };
		}
		const existingAuthentication = this.getClientAuthenticationByDeviceId(deviceId);
		if (existingAuthentication && !clientAuthenticationsEqual(existingAuthentication, authentication)) {
			return { allowed: false, reason: ConnectAuthCloseReason.DEVICE_AUTH_CONFLICT };
		}
		return { allowed: true, authentication };
	}

	getClientAuthenticationByDeviceId(deviceId: string): ClientAuthentication | null {
		for (const entry of this.getAllClientAuthentications()) {
			if (entry.deviceId === deviceId) {
				return entry.authentication;
			}
		}
		return null;
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
}
