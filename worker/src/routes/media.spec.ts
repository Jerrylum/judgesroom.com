import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { serverRouter } from '../server-router';
import { createTestServerContext, seedTestDatabase, sampleTeamInfoAndData } from '../test-utils';
import type { ServerContext } from '../server-router';
import type { Session } from '@judgesroom.com/wrpc/server/session';
import type { AnyRouter } from '@judgesroom.com/wrpc/server/router';
import { judges, metadata, pendingPhotoUploads, teamPhotos } from '../db/schema';
import { completePhotoUpload, getPhotoObject, listUploads } from './media';
import { PHOTO_CACHE_MAX_AGE_SECONDS } from '../media/constants';
import { uuidv4 } from '@judgesroom.com/protocol/src/utils';
import { Authentication } from '../access/authentication';
import { generateAuthToken } from '../access/tokens';

describe('media routes', () => {
	let context: ServerContext & { cleanup: () => void };
	let session: Session<AnyRouter>;
	let photoUpdates: unknown[];

	const teamId = sampleTeamInfoAndData[0]!.id;
	const deviceId = '550e8400-e29b-41d4-a716-446655440099';
	const roomId = '550e8400-e29b-41d4-a716-446655440010';

	beforeEach(async () => {
		context = createTestServerContext();
		await seedTestDatabase(context);
		photoUpdates = [];

		session = {
			getClient: () => ({}) as never,
			broadcast: () =>
				({
					onTeamPhotoUpdate: {
						mutation: async (input: unknown) => {
							photoUpdates.push(input);
							return [];
						}
					}
				}) as never,
			getServer: () => {
				throw new Error('getServer() cannot be called from server-side session');
			},
			roomId,
			currentClient: {
				clientId: '550e8400-e29b-41d4-a716-446655440011',
				deviceId,
				deviceName: 'Test Device'
			}
		};
	});

	afterEach(async () => {
		await new Promise((resolve) => setTimeout(resolve, 10));
		context.cleanup();
	});

	async function createAuthorizedUpload(byteSize = 16) {
		const resolver = serverRouter.media.createUpload._def._resolver!;
		return resolver({
			input: {
				teamId,
				contentType: 'image/jpeg',
				byteSize,
				judgeId: null
			},
			session,
			ctx: context
		});
	}

	describe('createUpload', () => {
		it('creates a pending upload token and url', async () => {
			const result = await createAuthorizedUpload(32);

			expect(result.photoId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
			);
			expect(result.uploadToken.length).toBeGreaterThan(0);
			expect(result.uploadUrl).toBe(`/media/upload?roomId=${encodeURIComponent(roomId)}`);

			const pending = await context.db
				.select()
				.from(pendingPhotoUploads)
				.where(eq(pendingPhotoUploads.token, result.uploadToken));
			expect(pending).toHaveLength(1);
			expect(pending[0]?.photoId).toBe(result.photoId);
			expect(pending[0]?.byteSize).toBe(32);
		});

		it('rejects unknown teams', async () => {
			const resolver = serverRouter.media.createUpload._def._resolver!;
			await expect(
				resolver({
					input: {
						teamId: '550e8400-e29b-41d4-a716-446655440999',
						contentType: 'image/jpeg',
						byteSize: 16,
						judgeId: null
					},
					session,
					ctx: context
				})
			).rejects.toThrow('Team not found');
		});

		it('rejects judgeId spoofing when bound as a different judge', async () => {
			await context.db.update(metadata).set({ accessControlEnabled: true });
			const boundJudgeId = uuidv4();
			const otherJudgeId = uuidv4();
			const resolver = serverRouter.media.createUpload._def._resolver!;

			await expect(
				resolver({
					input: {
						teamId,
						contentType: 'image/jpeg',
						byteSize: 16,
						judgeId: otherJudgeId
					},
					session,
					ctx: {
						...context,
						auth: Authentication.withFixture({
							isAccessControlled: true,
							authToken: generateAuthToken(),
							role: 'judge',
							judgeId: boundJudgeId
						})
					}
				})
			).rejects.toThrow('You can only create or edit as your bound judge');
		});

		it('allows upload as the bound judge when access control is on', async () => {
			await context.db.update(metadata).set({ accessControlEnabled: true });
			const boundJudgeId = uuidv4();
			await context.db.insert(judges).values({
				id: boundJudgeId,
				name: 'Bound',
				groupId: 'group-1',
				authToken: generateAuthToken()
			});
			const resolver = serverRouter.media.createUpload._def._resolver!;

			const result = await resolver({
				input: {
					teamId,
					contentType: 'image/jpeg',
					byteSize: 16,
					judgeId: boundJudgeId
				},
				session,
				ctx: {
					...context,
					auth: Authentication.withFixture({
						isAccessControlled: true,
						authToken: generateAuthToken(),
						role: 'judge',
						judgeId: boundJudgeId
					})
				}
			});

			expect(result.photoId).toBeTruthy();
			const pending = await context.db
				.select()
				.from(pendingPhotoUploads)
				.where(eq(pendingPhotoUploads.token, result.uploadToken));
			expect(pending[0]?.createdByJudgeId).toBe(boundJudgeId);
		});

		it('allows judge advisor uploads when access control is on', async () => {
			await context.db.update(metadata).set({ accessControlEnabled: true });
			const resolver = serverRouter.media.createUpload._def._resolver!;

			const result = await resolver({
				input: {
					teamId,
					contentType: 'image/jpeg',
					byteSize: 16,
					judgeId: null
				},
				session,
				ctx: {
					...context,
					auth: Authentication.withFixture({
						isAccessControlled: true,
						authToken: generateAuthToken(),
						role: 'judge_advisor'
					})
				}
			});

			expect(result.photoId).toBeTruthy();
		});
	});

	describe('completePhotoUpload', () => {
		it('stores the object, creates TeamPhotos row, and clears pending token', async () => {
			const auth = await createAuthorizedUpload(8);
			const body = new ArrayBuffer(8);

			const photo = await completePhotoUpload(context, auth.uploadToken, body, 'image/jpeg');

			expect(photo.id).toBe(auth.photoId);
			expect(photo.teamId).toBe(teamId);
			expect(photo.contentType).toBe('image/jpeg');
			expect(photo.byteSize).toBe(8);
			expect(photo.viewSecret.length).toBeGreaterThan(0);
			expect(photo.createdByDeviceId).toBe(deviceId);

			const stored = await context.photos.get(photo.id);
			expect(stored).not.toBeNull();

			const pending = await context.db
				.select()
				.from(pendingPhotoUploads)
				.where(eq(pendingPhotoUploads.token, auth.uploadToken));
			expect(pending).toHaveLength(0);

			const rows = await context.db.select().from(teamPhotos).where(eq(teamPhotos.id, photo.id));
			expect(rows).toHaveLength(1);
		});

		it('rejects invalid tokens', async () => {
			await expect(completePhotoUpload(context, uuidv4(), new ArrayBuffer(1), 'image/jpeg')).rejects.toThrow(
				'Invalid or expired upload token'
			);
		});

		it('rejects expired tokens (cleaned up before completion)', async () => {
			const auth = await createAuthorizedUpload(4);
			await context.db
				.update(pendingPhotoUploads)
				.set({ expiresAt: new Date(Date.now() - 1000) })
				.where(eq(pendingPhotoUploads.token, auth.uploadToken));

			// cleanupExpiredUploadTokens runs first and removes the row
			await expect(completePhotoUpload(context, auth.uploadToken, new ArrayBuffer(4), 'image/jpeg')).rejects.toThrow(
				'Invalid or expired upload token'
			);
		});

		it('rejects size mismatches', async () => {
			const auth = await createAuthorizedUpload(8);
			await expect(completePhotoUpload(context, auth.uploadToken, new ArrayBuffer(4), 'image/jpeg')).rejects.toThrow(
				/does not match authorized size/
			);
		});

		it('rejects content-type mismatches', async () => {
			const auth = await createAuthorizedUpload(8);
			await expect(completePhotoUpload(context, auth.uploadToken, new ArrayBuffer(8), 'image/png')).rejects.toThrow(
				'Content-Type does not match authorized upload'
			);
		});

		it('removes the R2 object if DB insert fails after put', async () => {
			const auth = await createAuthorizedUpload(4);
			await context.db.insert(teamPhotos).values({
				id: auth.photoId,
				teamId,
				contentType: 'image/jpeg',
				byteSize: 4,
				createdAt: new Date(),
				createdByDeviceId: deviceId,
				createdByJudgeId: null,
				viewSecret: 'preexisting-secret'
			});

			await expect(completePhotoUpload(context, auth.uploadToken, new ArrayBuffer(4), 'image/jpeg')).rejects.toThrow();
			expect(await context.photos.get(auth.photoId)).toBeNull();
		});
	});

	describe('getPhotoObject', () => {
		it('returns body and cache-control for a valid secret', async () => {
			const auth = await createAuthorizedUpload(4);
			const photo = await completePhotoUpload(context, auth.uploadToken, new ArrayBuffer(4), 'image/jpeg');

			const result = await getPhotoObject(context, photo.id, photo.viewSecret);
			expect(result.contentType).toBe('image/jpeg');
			expect(result.cacheControl).toBe(`public, max-age=${PHOTO_CACHE_MAX_AGE_SECONDS}`);
			expect(result.body.body).toBeInstanceOf(ReadableStream);
		});

		it('rejects wrong secrets', async () => {
			const auth = await createAuthorizedUpload(4);
			const photo = await completePhotoUpload(context, auth.uploadToken, new ArrayBuffer(4), 'image/jpeg');

			await expect(getPhotoObject(context, photo.id, 'wrong-secret')).rejects.toThrow('Photo not found');
		});
	});

	describe('deletePhoto', () => {
		it('removes storage + db row and broadcasts deletion', async () => {
			const auth = await createAuthorizedUpload(4);
			const photo = await completePhotoUpload(context, auth.uploadToken, new ArrayBuffer(4), 'image/jpeg');
			const deleteSpy = vi.spyOn(context.photos, 'delete');

			const resolver = serverRouter.media.deletePhoto._def._resolver!;
			const result = await resolver({
				input: { photoId: photo.id },
				session,
				ctx: context
			});

			expect(result).toEqual({ success: true });
			expect(deleteSpy).toHaveBeenCalledWith(photo.id);
			expect(await context.photos.get(photo.id)).toBeNull();

			const rows = await context.db.select().from(teamPhotos).where(eq(teamPhotos.id, photo.id));
			expect(rows).toHaveLength(0);

			expect(photoUpdates).toEqual([
				{
					action: 'deleted',
					photoId: photo.id,
					teamId
				}
			]);
		});

	});

	describe('listUploads', () => {
		it('includes stored and pending photo ids', async () => {
			const storedAuth = await createAuthorizedUpload(2);
			const stored = await completePhotoUpload(context, storedAuth.uploadToken, new ArrayBuffer(2), 'image/jpeg');
			const pendingAuth = await createAuthorizedUpload(2);

			const ids = await listUploads(context.db);
			expect(ids.has(stored.id)).toBe(true);
			expect(ids.has(pendingAuth.photoId)).toBe(true);
		});
	});
});
