import {
	buildPhotoViewPath,
	MAX_PHOTO_BYTES,
	PHOTO_JPEG_QUALITY,
	PHOTO_MAX_LONG_EDGE,
	type PhotoContentType,
	type TeamPhoto
} from '@judgesroom.com/protocol/src/media';
import { app } from './index.svelte';

export function getMediaBaseUrl(): string {
	return app.getMediaOrigin();
}

export function getPhotoObjectUrl(photo: TeamPhoto): string {
	const roomId = app.getPermit()?.roomId;
	if (!roomId) {
		throw new Error('No Judges\' Room permit');
	}
	return `${getMediaBaseUrl()}${buildPhotoViewPath(roomId, photo.id, photo.viewSecret)}`;
}

export async function compressImageForUpload(file: Blob): Promise<{ blob: Blob; contentType: PhotoContentType }> {
	const bitmap = await createImageBitmap(file);
	try {
		const scale = Math.min(1, PHOTO_MAX_LONG_EDGE / Math.max(bitmap.width, bitmap.height));
		const width = Math.max(1, Math.round(bitmap.width * scale));
		const height = Math.max(1, Math.round(bitmap.height * scale));

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('Unable to process image');
		}
		ctx.drawImage(bitmap, 0, 0, width, height);

		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', PHOTO_JPEG_QUALITY));
		if (!blob) {
			throw new Error('Unable to compress image');
		}
		if (blob.size > MAX_PHOTO_BYTES) {
			throw new Error(`Compressed photo still exceeds ${Math.round(MAX_PHOTO_BYTES / (1024 * 1024))} MB limit`);
		}
		return { blob, contentType: 'image/jpeg' };
	} finally {
		bitmap.close();
	}
}

export async function uploadTeamPhoto(teamId: string, file: Blob, judgeId: string | null): Promise<TeamPhoto> {
	const { blob, contentType } = await compressImageForUpload(file);
	const authorization = await app.wrpcClient.media.createUpload.mutation({
		teamId,
		contentType,
		byteSize: blob.size,
		judgeId
	});

	const response = await fetch(`${getMediaBaseUrl()}${authorization.uploadUrl}`, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${authorization.uploadToken}`,
			'Content-Type': contentType
		},
		body: blob
	});

	if (!response.ok) {
		const message = await response.text();
		throw new Error(message || 'Photo upload failed');
	}

	return (await response.json()) as TeamPhoto;
}

export async function deleteTeamPhoto(photoId: string): Promise<void> {
	await app.wrpcClient.media.deletePhoto.mutation({ photoId });
}
