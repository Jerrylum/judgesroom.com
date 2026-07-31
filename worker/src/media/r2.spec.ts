import { describe, it, expect, vi } from 'vitest';
import { createPhotosBucket } from './r2';
import { photoCacheTag } from './constants';

function createInMemoryR2(): R2Bucket {
	const objects = new Map<string, ArrayBuffer>();

	return {
		async put(key: string, value: ArrayBuffer | ArrayBufferView | string | null | Blob | ReadableStream) {
			let body: ArrayBuffer;
			if (value instanceof ArrayBuffer) {
				body = value;
			} else if (ArrayBuffer.isView(value)) {
				body = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
			} else if (typeof value === 'string') {
				body = new TextEncoder().encode(value).buffer as ArrayBuffer;
			} else if (value instanceof Blob) {
				body = await value.arrayBuffer();
			} else if (value === null) {
				body = new ArrayBuffer(0);
			} else {
				throw new Error('Unsupported body type in test R2');
			}
			objects.set(key, body);
			return { key, size: body.byteLength } as unknown as R2Object;
		},
		async get(key: string) {
			const body = objects.get(key);
			if (!body) return null;
			return {
				key,
				body: new ReadableStream({
					start(controller) {
						controller.enqueue(new Uint8Array(body));
						controller.close();
					}
				}),
				arrayBuffer: async () => body
			} as unknown as R2ObjectBody;
		},
		async delete(keys: string | string[]) {
			for (const key of Array.isArray(keys) ? keys : [keys]) {
				objects.delete(key);
			}
		},
		async head() {
			return null;
		},
		async list() {
			return { objects: [], truncated: false, delimitedPrefixes: [] };
		},
		createMultipartUpload() {
			throw new Error('Not implemented');
		},
		resumeMultipartUpload() {
			throw new Error('Not implemented');
		}
	} as unknown as R2Bucket;
}

describe('createPhotosBucket', () => {
	it('put/get round-trips by photo id', async () => {
		const photos = createPhotosBucket(createInMemoryR2(), async () => {});
		const photoId = '550e8400-e29b-41d4-a716-446655440101';
		const bytes = new TextEncoder().encode('jpeg-bytes').buffer;

		await photos.put(photoId, bytes, { httpMetadata: { contentType: 'image/jpeg' } });
		const object = await photos.get(photoId);
		expect(object).not.toBeNull();

		const reader = object!.body.getReader();
		const { value } = await reader.read();
		expect(new TextDecoder().decode(value)).toBe('jpeg-bytes');
	});

	it('delete removes the object and notifies onDelete with photo ids', async () => {
		const onDelete = vi.fn(async (_photoIds: string[]) => {});
		const photos = createPhotosBucket(createInMemoryR2(), onDelete);
		const photoId = '550e8400-e29b-41d4-a716-446655440102';

		await photos.put(photoId, new ArrayBuffer(8));
		await photos.delete(photoId);

		expect(await photos.get(photoId)).toBeNull();
		expect(onDelete).toHaveBeenCalledTimes(1);
		expect(onDelete).toHaveBeenCalledWith([photoId]);
	});

	it('delete with multiple ids notifies once with all ids', async () => {
		const onDelete = vi.fn(async (_photoIds: string[]) => {});
		const photos = createPhotosBucket(createInMemoryR2(), onDelete);
		const ids = ['550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440104'];

		await photos.put(ids[0]!, new ArrayBuffer(1));
		await photos.put(ids[1]!, new ArrayBuffer(1));
		await photos.delete(ids);

		expect(onDelete).toHaveBeenCalledWith(ids);
		expect(await photos.get(ids[0]!)).toBeNull();
		expect(await photos.get(ids[1]!)).toBeNull();
	});

	it('delete with empty list is a no-op', async () => {
		const onDelete = vi.fn(async (_photoIds: string[]) => {});
		const photos = createPhotosBucket(createInMemoryR2(), onDelete);

		await photos.delete([]);
		expect(onDelete).not.toHaveBeenCalled();
	});

	it('matches DO wiring: onDelete receives photo ids that map to photo cache tags', async () => {
		const purgedTags: string[][] = [];
		const photos = createPhotosBucket(createInMemoryR2(), async (photoIds) => {
			purgedTags.push(photoIds.map(photoCacheTag));
		});
		const photoId = '550e8400-e29b-41d4-a716-446655440105';

		await photos.put(photoId, new ArrayBuffer(1));
		await photos.delete(photoId);

		expect(purgedTags).toEqual([[`photo-${photoId}`]]);
	});
});
