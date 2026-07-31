import type { PhotosBucket } from './types';

/**
 * Wrap an R2 bucket so photo deletes also purge Workers Cache tags via CachedMedia.
 * Object keys are photo ids.
 */
export function createPhotosBucket(r2: R2Bucket, onDelete: (photoIds: string[]) => Promise<void>): PhotosBucket {
	return {
		async put(photoId, value, options) {
			return r2.put(photoId, value, options);
		},
		async get(photoId) {
			return r2.get(photoId);
		},
		async delete(photoId) {
			const photoIds = Array.isArray(photoId) ? photoId : [photoId];
			if (photoIds.length === 0) {
				return;
			}
			await r2.delete(photoIds);
			await onDelete(photoIds);
		}
	};
}
