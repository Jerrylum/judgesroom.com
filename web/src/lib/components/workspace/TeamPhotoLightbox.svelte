<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import Dialog from '$lib/components/dialog/Dialog.svelte';
	import ChevronLeftIcon from '$lib/icon/ChevronLeftIcon.svelte';
	import ChevronRightIcon from '$lib/icon/ChevronRightIcon.svelte';
	import { deleteTeamPhoto, getPhotoObjectUrl } from '$lib/media';
	import { app, subscriptions } from '$lib/index.svelte';
	import type { TeamPhoto } from '@judgesroom.com/protocol/src/media';

	interface Props {
		open: boolean;
		photos: TeamPhoto[];
		photoId: string | null;
		onClose: () => void;
		onPhotoIdChange: (photoId: string) => void;
		allowDelete?: boolean;
	}

	let { open, photos, photoId, onClose, onPhotoIdChange, allowDelete = true }: Props = $props();

	const currentIndex = $derived(photoId ? photos.findIndex((photo) => photo.id === photoId) : -1);
	const currentPhoto = $derived(currentIndex >= 0 ? photos[currentIndex] : null);
	const currentUrl = $derived.by(() => {
		if (!currentPhoto) return null;
		try {
			return getPhotoObjectUrl(currentPhoto);
		} catch {
			return null;
		}
	});

	function photoUrl(photo: TeamPhoto): string | null {
		try {
			return getPhotoObjectUrl(photo);
		} catch {
			return null;
		}
	}

	function goToIndex(index: number) {
		if (photos.length === 0) return;
		const next = ((index % photos.length) + photos.length) % photos.length;
		const photo = photos[next];
		if (photo) onPhotoIdChange(photo.id);
	}

	function goPrevious() {
		if (currentIndex < 0) return;
		goToIndex(currentIndex - 1);
	}

	function goNext() {
		if (currentIndex < 0) return;
		goToIndex(currentIndex + 1);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!open || photos.length === 0) return;
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			goPrevious();
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			goNext();
		}
	}

	async function handleDelete() {
		if (!photoId || !allowDelete) return;
		try {
			await deleteTeamPhoto(photoId);
			delete subscriptions.allTeamPhotos[photoId];
			const remaining = photos.filter((photo) => photo.id !== photoId);
			if (remaining.length === 0) {
				onClose();
				return;
			}
			const nextIndex = Math.min(currentIndex, remaining.length - 1);
			const nextPhoto = remaining[nextIndex];
			if (nextPhoto) onPhotoIdChange(nextPhoto.id);
		} catch (error) {
			const message = error instanceof Error ? error.message : m.photo_delete_failed();
			app.addErrorNotice(message);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<Dialog {open} {onClose} innerContainerClass="max-w-5xl">
	{#if currentPhoto && currentUrl}
		<div class="flex flex-col gap-3">
			<div class="relative flex min-h-[40vh] items-center justify-center bg-gray-950">
				<img src={currentUrl} alt="" class="max-h-[70vh] max-w-full object-contain" />

				{#if photos.length > 1}
					<button
						type="button"
						class="nav-zone left"
						tabindex="-1"
						onclick={goPrevious}
						title={m.previous_photo()}
						aria-label={m.previous_photo()}
					>
						<span class="nav-btn">
							<ChevronLeftIcon size={24} />
						</span>
					</button>
					<button type="button" class="nav-zone right" tabindex="-1" onclick={goNext} title={m.next_photo()} aria-label={m.next_photo()}>
						<span class="nav-btn">
							<ChevronRightIcon size={24} />
						</span>
					</button>
				{/if}
			</div>

			{#if photos.length > 1}
				<div class="flex flex-row flex-wrap justify-center gap-2">
					{#each photos as photo, index (photo.id)}
						{@const url = photoUrl(photo)}
						<button
							type="button"
							class={{
								'h-20 w-20 overflow-hidden rounded border-2 border-transparent bg-gray-100': true,
								'border-blue-500!': photo.id === photoId
							}}
							onclick={() => onPhotoIdChange(photo.id)}
							title={new Date(photo.createdAt).toLocaleString()}
							aria-label={`${index + 1} / ${photos.length}`}
							aria-current={photo.id === photoId ? 'true' : undefined}
						>
							{#if url}
								<img src={url} alt="" class="h-full w-full object-cover" />
							{/if}
						</button>
					{/each}
				</div>
			{/if}

			<div class="flex items-center justify-between gap-2">
				<p class="text-xs text-gray-500">
					{#if photos.length > 0 && currentIndex >= 0}
						{currentIndex + 1} / {photos.length}
					{/if}
				</p>
				<div class="flex justify-end gap-2">
					<button type="button" class="secondary tiny" onclick={onClose}>{m.cancel()}</button>
					{#if allowDelete}
						<button type="button" class="danger tiny" onclick={handleDelete}>{m.delete_photo()}</button>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<div class="flex flex-col gap-3">
			<p class="text-sm text-gray-600">{m.no_team_photos_yet()}</p>
			<div class="flex justify-end">
				<button type="button" class="secondary tiny" onclick={onClose}>{m.cancel()}</button>
			</div>
		</div>
	{/if}
</Dialog>

<style lang="postcss">
	@reference 'tailwindcss';

	.nav-zone {
		@apply absolute top-0 bottom-0 flex w-1/3 items-center border-0 bg-transparent p-0 opacity-100 outline-none transition-opacity focus:outline-none focus-visible:opacity-100 focus-visible:outline-none md:opacity-0 md:hover:opacity-100;
	}

	.nav-zone.left {
		@apply left-0 justify-start pl-2;
	}

	.nav-zone.right {
		@apply right-0 justify-end pr-2;
	}

	.nav-btn {
		@apply flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white;
	}
</style>
