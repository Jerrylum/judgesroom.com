import { roomPhotosPrefix } from './constants';
import type { PhotosBucket } from './types';

/**
 * Delete every R2 object under rooms/{roomId}/.
 */
export async function deleteRoomPhotoObjects(bucket: PhotosBucket, roomId: string): Promise<void> {
	const prefix = roomPhotosPrefix(roomId);
	let cursor: string | undefined;

	do {
		const listed = await bucket.list({ prefix, cursor, limit: 1000 });
		await Promise.all(listed.objects.map((object) => bucket.delete(object.key)));
		cursor = listed.truncated ? listed.cursor : undefined;
	} while (cursor);
}
