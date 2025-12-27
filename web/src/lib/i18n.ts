import { m } from './paraglide/messages.js';
import DOMPurify from 'dompurify';

// Escape HTML entities to prevent XSS
function escapeHtml(text: unknown): unknown {
	if (typeof text !== 'string') return text;
	const map: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};
	return text.replace(/[&<>"']/g, (char) => map[char]);
}

// Sanitize all string values in an inputs object
function sanitizeInputs<T extends Record<string, unknown>>(inputs: T): T {
	const sanitized = {} as T;
	for (const key in inputs) {
		sanitized[key] = escapeHtml(inputs[key]) as T[typeof key];
	}
	return sanitized;
}

type HTMLMessages = {
	[K in keyof typeof m]: (typeof m)[K];
};

export const htmlM: HTMLMessages = new Proxy(m, {
	get(target, prop: string) {
		const originalFn = target[prop as keyof typeof target] as (...args: unknown[]) => string;

		if (typeof originalFn !== 'function') {
			return originalFn;
		}

		return (inputs: Record<string, unknown> = {}, ...args: unknown[]) => {
			const sanitizedInputs = inputs ? sanitizeInputs(inputs) : inputs;
			const result = originalFn(sanitizedInputs, ...args);
			return DOMPurify.sanitize(result, { ALLOWED_TAGS: ['b', 'i', 'u'], ALLOWED_ATTR: [], ADD_TAGS: ['green', 'red', 'slate'] });
		};
	}
});
