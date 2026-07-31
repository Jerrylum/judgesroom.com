<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { app, subscriptions } from '$lib/index.svelte';
	import { getPhotoObjectUrl, uploadTeamPhoto } from '$lib/media';
	import { MAX_PHOTOS_PER_TEAM } from '@judgesroom.com/protocol/src/media';
	import type { TeamPhoto } from '@judgesroom.com/protocol/src/media';
	import { generateUUID } from '$lib/utils.svelte';
	import ImagesIcon from '$lib/icon/ImagesIcon.svelte';
	import TeamPhotoLightbox from './TeamPhotoLightbox.svelte';

	interface Props {
		teamId: string;
		compact?: boolean;
		allowCapture?: boolean;
	}

	let { teamId, compact = false, allowCapture = true }: Props = $props();

	let fileInput: HTMLInputElement | undefined = $state();
	let uploading = $state(false);
	let errorMessage = $state('');
	let localPreviews = $state<{ id: string; url: string }[]>([]);
	let lightboxOpen = $state(false);
	let lightboxPhotoId = $state<string | null>(null);

	const photos = $derived(
		Object.values(subscriptions.allTeamPhotos)
			.filter((photo) => photo.teamId === teamId)
			.sort((a, b) => a.createdAt - b.createdAt)
	);

	function photoUrl(photo: TeamPhoto): string | null {
		try {
			return getPhotoObjectUrl(photo);
		} catch {
			return null;
		}
	}

	async function handleFiles(files: FileList | null) {
		if (!files || files.length === 0) return;
		errorMessage = '';
		uploading = true;

		try {
			const remaining = MAX_PHOTOS_PER_TEAM - photos.length;
			if (remaining <= 0) {
				throw new Error(m.photo_limit_reached({ count: MAX_PHOTOS_PER_TEAM }));
			}

			const selected = Array.from(files).slice(0, remaining);
			const currentUser = app.getCurrentUser();
			const judgeId = currentUser?.role === 'judge' ? currentUser.judge.id : null;

			for (const file of selected) {
				const previewId = generateUUID();
				const previewUrl = URL.createObjectURL(file);
				localPreviews = [...localPreviews, { id: previewId, url: previewUrl }];

				try {
					const photo = await uploadTeamPhoto(teamId, file, judgeId);
					subscriptions.allTeamPhotos[photo.id] = photo;
				} finally {
					URL.revokeObjectURL(previewUrl);
					localPreviews = localPreviews.filter((preview) => preview.id !== previewId);
				}
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : m.photo_upload_failed();
			app.addErrorNotice(errorMessage);
		} finally {
			uploading = false;
			if (fileInput) fileInput.value = '';
		}
	}

	function openLightbox(photo: TeamPhoto) {
		lightboxPhotoId = photo.id;
		lightboxOpen = true;
	}

	function openLightboxFromStart() {
		const first = photos[0];
		if (!first) return;
		openLightbox(first);
	}

	function closeLightbox() {
		lightboxOpen = false;
		lightboxPhotoId = null;
	}
</script>

<div class="team-photo-album" class:compact>
	{#if !compact}
		<div class="mb-2 flex items-center justify-between gap-2">
			<div class="text-sm font-medium text-gray-800">
				{m.team_photos()}
				<span class="font-normal text-gray-500">({photos.length}/{MAX_PHOTOS_PER_TEAM})</span>
			</div>
			{#if allowCapture}
				<button class="lightweight tiny" disabled={uploading || photos.length >= MAX_PHOTOS_PER_TEAM} onclick={() => fileInput?.click()}>
					{uploading ? m.uploading_photos() : m.take_or_add_photos()}
				</button>
			{/if}
		</div>
	{/if}

	{#if allowCapture}
		<input
			bind:this={fileInput}
			type="file"
			accept="image/jpeg,image/png,image/webp"
			capture="environment"
			multiple
			class="hidden"
			onchange={(event) => handleFiles((event.currentTarget as HTMLInputElement).files)}
		/>
	{/if}

	{#if errorMessage}
		<p class="mb-2 text-xs text-red-600">{errorMessage}</p>
	{/if}

	{#if compact}
		{#if photos.length === 0}
			<p class="text-xs text-gray-400">—</p>
		{:else}
			<button
				type="button"
				class="view-photos-btn"
				onclick={openLightboxFromStart}
				title={m.view_team_photos({ count: photos.length })}
				aria-label={m.view_team_photos({ count: photos.length })}
			>
				<ImagesIcon size={16} />
				<span>{photos.length}</span>
			</button>
		{/if}
	{:else if photos.length === 0 && localPreviews.length === 0}
		<p class="text-xs text-gray-400">{m.no_team_photos_yet()}</p>
	{:else}
		<div class="flex flex-row flex-wrap gap-2">
			{#each localPreviews as preview (preview.id)}
				<div class="thumb uploading">
					<img src={preview.url} alt="" class="h-full w-full object-cover opacity-70" />
				</div>
			{/each}
			{#each photos as photo (photo.id)}
				{@const url = photoUrl(photo)}
				<button type="button" class="thumb" onclick={() => openLightbox(photo)} title={new Date(photo.createdAt).toLocaleString()}>
					{#if url}
						<img src={url} alt="" loading="lazy" class="h-full w-full object-cover" />
					{:else}
						<div class="flex h-full w-full items-center justify-center bg-gray-200 text-[10px] text-gray-500">…</div>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<TeamPhotoLightbox
	open={lightboxOpen}
	{photos}
	photoId={lightboxPhotoId}
	onClose={closeLightbox}
	onPhotoIdChange={(id) => (lightboxPhotoId = id)}
	allowDelete={true}
/>

<style lang="postcss">
	@reference 'tailwindcss';

	.thumb {
		@apply h-16 w-16 overflow-hidden rounded border border-gray-200 bg-gray-100;
	}

	.view-photos-btn {
		@apply inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 active:bg-gray-100;
	}
</style>
