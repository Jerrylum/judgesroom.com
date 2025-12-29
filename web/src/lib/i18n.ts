// import { m } from './paraglide/messages.js';
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

type FirstParameter<T extends (...args: any) => any> = T extends (arg: infer P, ...args: any[]) => any ? P : never;

type OtherParameters<T extends (...args: any) => any> = T extends (arg: any, ...args: infer P) => any ? P : never;

export function sanitizeHTMLMessage<Fn extends (...args: any[]) => any>(
	fn: Fn,
	inputs?: FirstParameter<Fn>,
	...args: OtherParameters<Fn>
): string {
	const sanitizedInputs = inputs ? sanitizeInputs(inputs) : inputs;
	const result = fn(sanitizedInputs, ...args);
	return DOMPurify.sanitize(result, { ALLOWED_TAGS: ['b', 'i', 'u'], ALLOWED_ATTR: [], ADD_TAGS: ['green', 'red', 'slate'] });
}
