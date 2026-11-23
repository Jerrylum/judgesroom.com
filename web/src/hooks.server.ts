import type { Handle } from '@sveltejs/kit/hooks';
import { paraglideMiddleware } from '#lib/paraglide/server.js';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		return resolve(
			{ ...event, request, url: new URL(request.url) },
			{
				transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
			}
		);
	});

export const handle: Handle = handleParaglide;
