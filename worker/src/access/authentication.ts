import {
	type ClientAuthentication,
	uncontrolledAuthentication
} from '@judgesroom.com/protocol/src/access';

type PersistAuthentication = (authentication: ClientAuthentication) => void;

export type AuthenticationInit = {
	authentication: ClientAuthentication;
	persist?: PersistAuthentication;
};

/**
 * Connection access-link identity for a request.
 * Backed by the WebSocket attachment; not re-resolved from DB per message.
 * Distinct from the client's UI working-as role.
 */
export class Authentication {
	#authentication: ClientAuthentication;
	readonly #persist: PersistAuthentication | undefined;

	constructor(init: AuthenticationInit) {
		this.#authentication = init.authentication;
		this.#persist = init.persist;
	}

	static unauthenticated(): Authentication {
		return new Authentication({ authentication: uncontrolledAuthentication });
	}

	/** Test / fixture helper. */
	static withFixture(authentication: ClientAuthentication = uncontrolledAuthentication): Authentication {
		return new Authentication({ authentication });
	}

	get authentication(): ClientAuthentication {
		return this.#authentication;
	}

	get authToken(): string | null {
		return this.#authentication.isAccessControlled ? this.#authentication.authToken : null;
	}

	isAuthenticated(): boolean {
		return this.#authentication.isAccessControlled;
	}

	isAuthenticatedJudgeAdvisor(): boolean {
		return this.#authentication.isAccessControlled && this.#authentication.role === 'judge_advisor';
	}

	isAuthenticatedJudge(): boolean {
		return this.#authentication.isAccessControlled && this.#authentication.role === 'judge';
	}

	getJudgeId(): string | null {
		return this.#authentication.isAccessControlled && this.#authentication.role === 'judge'
			? this.#authentication.judgeId
			: null;
	}

	setAuthentication(authentication: ClientAuthentication): void {
		this.#persist?.(authentication);
		this.#authentication = authentication;
	}
}
