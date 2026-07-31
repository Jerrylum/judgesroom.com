import { z } from 'zod';

export const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // 3 MB
export const MAX_PHOTOS_PER_TEAM = 20;
export const MAX_PHOTOS_PER_ROOM = 100;
export const PHOTO_MAX_LONG_EDGE = 1600;
export const PHOTO_JPEG_QUALITY = 0.8;

export const ALLOWED_PHOTO_CONTENT_TYPES = ['image/jpeg', 'image/webp', 'image/png'] as const;

export const PhotoContentTypeSchema = z.enum(ALLOWED_PHOTO_CONTENT_TYPES);

export type PhotoContentType = z.infer<typeof PhotoContentTypeSchema>;

export const TeamPhotoSchema = z.object({
	id: z.uuidv4(),
	teamId: z.uuidv4(),
	contentType: PhotoContentTypeSchema,
	byteSize: z.number().int().positive().max(MAX_PHOTO_BYTES),
	createdAt: z.number().int(), // unix ms
	createdByDeviceId: z.uuidv4(),
	createdByJudgeId: z.uuidv4().nullable(),
	/** Unguessable capability secret embedded in the stable media URL */
	viewSecret: z.string().min(1)
});

export type TeamPhoto = z.infer<typeof TeamPhotoSchema>;

export const CreatePhotoUploadInputSchema = z.object({
	teamId: z.uuidv4(),
	contentType: PhotoContentTypeSchema,
	byteSize: z.number().int().positive().max(MAX_PHOTO_BYTES),
	judgeId: z.uuidv4().nullable().optional()
});

export type CreatePhotoUploadInput = z.infer<typeof CreatePhotoUploadInputSchema>;

export const CreatePhotoUploadResultSchema = z.object({
	photoId: z.uuidv4(),
	uploadToken: z.string().min(1),
	uploadUrl: z.string().min(1)
});

export type CreatePhotoUploadResult = z.infer<typeof CreatePhotoUploadResultSchema>;

export const TeamPhotoUpdateSchema = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('added'),
		photo: TeamPhotoSchema
	}),
	z.object({
		action: z.literal('deleted'),
		photoId: z.uuidv4(),
		teamId: z.uuidv4()
	})
]);

export type TeamPhotoUpdate = z.infer<typeof TeamPhotoUpdateSchema>;

/** Stable, cacheable photo URL path (roomId/photoId/viewSecret are the capability). */
export function buildPhotoViewPath(roomId: string, photoId: string, viewSecret: string): string {
	return `/media/photo?roomId=${encodeURIComponent(roomId)}&photoId=${encodeURIComponent(photoId)}&secret=${encodeURIComponent(viewSecret)}`;
}
