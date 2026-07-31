import {
	CreatePhotoUploadInputSchema,
	CreatePhotoUploadResultSchema,
	MAX_PHOTO_BYTES,
	MAX_PHOTOS_PER_ROOM,
	MAX_PHOTOS_PER_TEAM,
	TeamPhotoSchema,
	type TeamPhoto
} from '@judgesroom.com/protocol/src/media';
import type { WRPCRootObject } from '@judgesroom.com/wrpc/server';
import { count, eq, lt } from 'drizzle-orm';
import { z } from 'zod';
import type { ClientRouter } from '@judgesroom.com/web/src/lib/client-router';
import { pendingPhotoUploads, teamPhotos, teams } from '../db/schema';
import {
	PHOTO_CACHE_MAX_AGE_SECONDS,
	photoCacheTags,
	photoObjectKey,
	timingSafeEqualString,
	UPLOAD_TOKEN_TTL_MS
} from '../media/constants';
import type { PhotosObjectBody } from '../media/types';
import type { DatabaseOrTransaction, ServerContext } from '../server-router';
import { uuidv4 } from '@judgesroom.com/protocol/src/utils';

function toTeamPhoto(row: {
	id: string;
	teamId: string;
	contentType: string;
	byteSize: number;
	createdAt: Date;
	createdByDeviceId: string;
	createdByJudgeId: string | null;
	viewSecret: string;
}): TeamPhoto {
	return {
		id: row.id,
		teamId: row.teamId,
		contentType: row.contentType as TeamPhoto['contentType'],
		byteSize: row.byteSize,
		createdAt: row.createdAt.getTime(),
		createdByDeviceId: row.createdByDeviceId,
		createdByJudgeId: row.createdByJudgeId,
		viewSecret: row.viewSecret
	};
}

export async function listAllTeamPhotos(db: DatabaseOrTransaction): Promise<TeamPhoto[]> {
	const rows = await db.select().from(teamPhotos);
	return rows.map(toTeamPhoto);
}

export async function listTeamPhotos(db: DatabaseOrTransaction, teamId: string): Promise<TeamPhoto[]> {
	const rows = await db.select().from(teamPhotos).where(eq(teamPhotos.teamId, teamId));
	return rows.map(toTeamPhoto);
}

async function cleanupExpiredUploadTokens(db: DatabaseOrTransaction): Promise<void> {
	const now = new Date();
	await db.delete(pendingPhotoUploads).where(lt(pendingPhotoUploads.expiresAt, now));
}

export function buildMediaRoute(w: WRPCRootObject<object, ServerContext, Record<string, never>>) {
	return {
		listAllTeamPhotos: w.procedure.output(z.array(TeamPhotoSchema)).query(async ({ ctx }) => {
			return listAllTeamPhotos(ctx.db);
		}),

		listTeamPhotos: w.procedure
			.input(z.object({ teamId: z.uuidv4() }))
			.output(z.array(TeamPhotoSchema))
			.query(async ({ ctx, input }) => {
				return listTeamPhotos(ctx.db, input.teamId);
			}),

		createUpload: w.procedure
			.input(CreatePhotoUploadInputSchema)
			.output(CreatePhotoUploadResultSchema)
			.mutation(async ({ ctx, input, session }) => {
				await cleanupExpiredUploadTokens(ctx.db);

				if (input.byteSize > MAX_PHOTO_BYTES) {
					throw new Error(`Photo exceeds maximum size of ${MAX_PHOTO_BYTES} bytes`);
				}

				const team = await ctx.db.select({ id: teams.id }).from(teams).where(eq(teams.id, input.teamId)).limit(1);
				if (team.length === 0) {
					throw new Error('Team not found');
				}

				const [teamCountRow] = await ctx.db
					.select({ value: count() })
					.from(teamPhotos)
					.where(eq(teamPhotos.teamId, input.teamId));
				if ((teamCountRow?.value ?? 0) >= MAX_PHOTOS_PER_TEAM) {
					throw new Error(`Maximum of ${MAX_PHOTOS_PER_TEAM} photos per team reached`);
				}

				const [roomCountRow] = await ctx.db.select({ value: count() }).from(teamPhotos);
				if ((roomCountRow?.value ?? 0) >= MAX_PHOTOS_PER_ROOM) {
					throw new Error(`Maximum of ${MAX_PHOTOS_PER_ROOM} photos per Judges' Room reached`);
				}

				const photoId = uuidv4();
				const uploadToken = uuidv4();
				const objectKey = photoObjectKey(session.roomId, input.teamId, photoId, input.contentType);
				const expiresAt = new Date(Date.now() + UPLOAD_TOKEN_TTL_MS);

				await ctx.db.insert(pendingPhotoUploads).values({
					token: uploadToken,
					photoId,
					teamId: input.teamId,
					contentType: input.contentType,
					byteSize: input.byteSize,
					objectKey,
					createdByDeviceId: session.currentClient.deviceId,
					createdByJudgeId: input.judgeId ?? null,
					expiresAt
				});

				return {
					photoId,
					uploadToken,
					uploadUrl: `/media/upload?roomId=${encodeURIComponent(session.roomId)}`
				};
			}),

		deletePhoto: w.procedure
			.input(z.object({ photoId: z.uuidv4() }))
			.mutation(async ({ ctx, input, session }) => {
				const rows = await ctx.db.select().from(teamPhotos).where(eq(teamPhotos.id, input.photoId)).limit(1);
				const photo = rows[0];
				if (!photo) {
					throw new Error('Photo not found');
				}

				await ctx.photos.delete(photo.objectKey);
				await ctx.db.delete(teamPhotos).where(eq(teamPhotos.id, input.photoId));
				await ctx.purgePhotoCacheTags?.(photoCacheTags(session.roomId, photo.id));

				session.broadcast<ClientRouter>().onTeamPhotoUpdate.mutation({
					action: 'deleted',
					photoId: photo.id,
					teamId: photo.teamId
				});

				return { success: true };
			})
	};
}

export async function completePhotoUpload(
	ctx: ServerContext,
	token: string,
	body: ArrayBuffer,
	contentTypeHeader: string | null,
	broadcast: (photo: TeamPhoto) => void
): Promise<TeamPhoto> {
	await cleanupExpiredUploadTokens(ctx.db);

	const pendingRows = await ctx.db.select().from(pendingPhotoUploads).where(eq(pendingPhotoUploads.token, token)).limit(1);
	const pending = pendingRows[0];
	if (!pending) {
		throw new Error('Invalid or expired upload token');
	}

	if (pending.expiresAt.getTime() < Date.now()) {
		await ctx.db.delete(pendingPhotoUploads).where(eq(pendingPhotoUploads.token, token));
		throw new Error('Upload token expired');
	}

	if (body.byteLength !== pending.byteSize) {
		throw new Error(`Uploaded size ${body.byteLength} does not match authorized size ${pending.byteSize}`);
	}

	if (body.byteLength > MAX_PHOTO_BYTES) {
		throw new Error(`Photo exceeds maximum size of ${MAX_PHOTO_BYTES} bytes`);
	}

	if (contentTypeHeader && contentTypeHeader !== pending.contentType) {
		throw new Error('Content-Type does not match authorized upload');
	}

	const [teamCountRow] = await ctx.db.select({ value: count() }).from(teamPhotos).where(eq(teamPhotos.teamId, pending.teamId));
	if ((teamCountRow?.value ?? 0) >= MAX_PHOTOS_PER_TEAM) {
		await ctx.db.delete(pendingPhotoUploads).where(eq(pendingPhotoUploads.token, token));
		throw new Error(`Maximum of ${MAX_PHOTOS_PER_TEAM} photos per team reached`);
	}

	await ctx.photos.put(pending.objectKey, body, {
		httpMetadata: { contentType: pending.contentType }
	});

	const createdAt = new Date();
	const viewSecret = uuidv4();
	await ctx.db.insert(teamPhotos).values({
		id: pending.photoId,
		teamId: pending.teamId,
		objectKey: pending.objectKey,
		contentType: pending.contentType,
		byteSize: pending.byteSize,
		createdAt,
		createdByDeviceId: pending.createdByDeviceId,
		createdByJudgeId: pending.createdByJudgeId,
		viewSecret
	});

	await ctx.db.delete(pendingPhotoUploads).where(eq(pendingPhotoUploads.token, token));

	const photo = toTeamPhoto({
		id: pending.photoId,
		teamId: pending.teamId,
		contentType: pending.contentType,
		byteSize: pending.byteSize,
		createdAt,
		createdByDeviceId: pending.createdByDeviceId,
		createdByJudgeId: pending.createdByJudgeId,
		viewSecret
	});

	broadcast(photo);
	return photo;
}

export async function getPhotoObject(
	ctx: ServerContext,
	photoId: string,
	viewSecret: string
): Promise<{ body: PhotosObjectBody; contentType: string; cacheControl: string }> {
	const photoRows = await ctx.db.select().from(teamPhotos).where(eq(teamPhotos.id, photoId)).limit(1);
	const photo = photoRows[0];
	if (!photo || !timingSafeEqualString(photo.viewSecret, viewSecret)) {
		throw new Error('Photo not found');
	}

	const object = await ctx.photos.get(photo.objectKey);
	if (!object) {
		throw new Error('Photo object missing from storage');
	}

	return {
		body: object,
		contentType: photo.contentType,
		cacheControl: `public, max-age=${PHOTO_CACHE_MAX_AGE_SECONDS}`
	};
}
