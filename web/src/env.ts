import { defineEnvVars } from '@sveltejs/kit/env';

// Optional. A missing or empty site key leaves the Turnstile widget disabled.
export const variables = defineEnvVars({
	PUBLIC_TURNSTILE_SITE_KEY: { public: true, schema: (input) => input ?? '' }
});
