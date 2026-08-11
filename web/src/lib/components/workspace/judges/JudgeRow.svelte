<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { app, dialogs, subscriptions } from '$lib/index.svelte';
	import JudgeAccessLinkDialog from './JudgeAccessLinkDialog.svelte';
	import RemoveJudgeConfirmDialog from './RemoveJudgeConfirmDialog.svelte';
	import RowOverflowMenu from './RowOverflowMenu.svelte';
	import { JudgeNameSchema } from '@judgesroom.com/protocol/src/judging';
	import { canUseClipboard } from '$lib/utils.svelte';

	interface Props {
		rowKey: string;
		selected: boolean;
		onSelect: (rowKey: string | null) => void;
		name: string;
		judgeId: string;
		groupId: string;
		authToken?: string | null;
		onAccessLinksChanged?: () => void;
	}

	let { rowKey, selected, onSelect, name, judgeId, groupId, authToken = null, onAccessLinksChanged }: Props = $props();

	const accessControlEnabled = $derived(app.isAccessControlEnabled());
	const devices = $derived(
		app.getDevices().filter((device) => {
			const auth = device.authenticated;
			return auth?.role === 'judge' && auth.judgeId === judgeId;
		})
	);
	const online = $derived(devices.filter((device) => device.isOnline).length);
	const clipboardAvailable = canUseClipboard();

	function handleRowClick() {
		onSelect(selected ? null : rowKey);
	}

	async function copyAccessLink() {
		if (!authToken) return;
		try {
			await navigator.clipboard.writeText(app.getJudgesRoomUrl(authToken));
			app.addSuccessNotice(m.copied());
		} catch (error) {
			console.error('Failed to copy access link:', error);
			app.addErrorNotice(error instanceof Error ? error.message : String(error));
		}
	}

	async function openAccessLinkDialog(accessUrl: string) {
		await dialogs.showCustom(JudgeAccessLinkDialog, {
			props: {
				name,
				accessUrl,
				judgeId,
				onAccessLinksChanged
			},
			maxWidth: 'max-w-4xl'
		});
	}

	async function rotateLink() {
		const confirmed = await dialogs.showConfirmation({
			title: m.rotate_access_link(),
			message: m.rotate_access_link_confirm(),
			confirmText: m.rotate_access_link(),
			confirmButtonClass: 'danger'
		});
		if (!confirmed) return;

		try {
			const { authToken: nextToken } = await app.wrpcClient.access.rotateJudgeAuth.mutation({ judgeId });
			onAccessLinksChanged?.();
			await openAccessLinkDialog(app.getJudgesRoomUrl(nextToken));
		} catch (error) {
			console.error('Failed to rotate access link:', error);
			app.addErrorNotice(error instanceof Error ? error.message : String(error));
		}
	}

	async function renameJudge() {
		const nextName = await dialogs.showPrompt({
			title: m.rename_judge(),
			message: m.rename_judge_prompt(),
			defaultValue: name,
			confirmText: m.rename_judge(),
			cancelText: m.cancel()
		});
		if (nextName === null) return;
		const parsed = JudgeNameSchema.safeParse(nextName.trim());
		if (!parsed.success) {
			app.addErrorNotice(parsed.error.issues[0]?.message ?? 'Invalid name');
			return;
		}
		try {
			await app.wrpcClient.judge.updateJudge.mutation({ id: judgeId, name: parsed.data, groupId });
		} catch (error) {
			console.error('Failed to rename judge:', error);
			app.addErrorNotice(error instanceof Error ? error.message : String(error));
		}
	}

	function getSubmissionCountsFromCache() {
		const caches = Object.values(subscriptions.allSubmissionCaches).filter((cache) => cache.judgeId === judgeId);
		return {
			notebookRubrics: caches.filter((cache) => Boolean(cache.enrId)).length,
			teamInterviewRubrics: caches.filter((cache) => Boolean(cache.tiId)).length
		};
	}

	async function removeJudge() {
		try {
			const counts = getSubmissionCountsFromCache();
			let confirmed = false;
			if (counts.notebookRubrics === 0 && counts.teamInterviewRubrics === 0) {
				confirmed = await dialogs.showConfirmation({
					title: m.remove_judge_confirm_title(),
					message: m.remove_judge_confirm_no_rubrics(),
					confirmText: m.remove_judge(),
					confirmButtonClass: 'danger'
				});
			} else {
				confirmed = Boolean(
					await dialogs.showCustom(RemoveJudgeConfirmDialog, {
						props: {
							judgeName: name,
							notebookCount: counts.notebookRubrics,
							interviewCount: counts.teamInterviewRubrics
						},
						maxWidth: 'max-w-md'
					})
				);
			}
			if (!confirmed) return;
			await app.wrpcClient.judge.removeJudge.mutation({ judgeId });
			onAccessLinksChanged?.();
		} catch (error) {
			console.error('Failed to remove judge:', error);
			app.addErrorNotice(error instanceof Error ? error.message : String(error));
		}
	}
</script>

<div
	class="group rounded-lg border bg-white transition-colors"
	class:border-gray-200={!selected}
	class:border-slate-400={selected}
	class:bg-slate-50={selected}
	class:ring-1={selected}
	class:ring-slate-300={selected}
>
	<div
		role="button"
		tabindex="0"
		class="flex cursor-pointer items-center gap-1 px-2 py-2.5 sm:gap-2 sm:px-3"
		onpointerdown={handleRowClick}
		onkeydown={(event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				handleRowClick();
			}
		}}
	>
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-2">
				<div class="truncate text-sm font-medium text-gray-900">{name}</div>
				{#if accessControlEnabled}
					{#if online > 0}
						<span class="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
							<span class="h-1.5 w-1.5 rounded-full bg-green-500"></span>
							{m.online_device_count({ count: online })}
						</span>
					{:else}
						<span class="text-xs text-gray-400">{m.no_devices_online()}</span>
					{/if}
				{/if}
			</div>
		</div>
		<div
			class="pointer-events-none hidden shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 sm:flex"
			class:pointer-events-auto={selected}
			class:opacity-100={selected}
			onpointerdown={(event) => event.stopPropagation()}
		>
			<button type="button" onclick={() => void renameJudge()} class="lightweight tiny">
				{m.rename_judge()}
			</button>
			{#if accessControlEnabled && authToken}
				<button type="button" onclick={() => void openAccessLinkDialog(app.getJudgesRoomUrl(authToken))} class="lightweight tiny">
					{m.access_link()}
				</button>
			{/if}
		</div>
		<div onpointerdown={(event) => event.stopPropagation()}>
			<RowOverflowMenu align="right">
				{#snippet children({ close })}
					<button
						type="button"
						role="menuitem"
						class="hidden text-gray-800 max-sm:block"
						onclick={() => {
							close();
							void renameJudge();
						}}
					>
						{m.rename_judge()}
					</button>
					{#if accessControlEnabled && authToken}
						<button
							type="button"
							role="menuitem"
							class="hidden text-gray-800 max-sm:block"
							onclick={() => {
								close();
								void openAccessLinkDialog(app.getJudgesRoomUrl(authToken));
							}}
						>
							{m.access_link()}
						</button>
						{#if clipboardAvailable}
							<button
								type="button"
								role="menuitem"
								class="block text-gray-800"
								onclick={() => {
									close();
									void copyAccessLink();
								}}
							>
								{m.copy_access_link()}
							</button>
						{/if}
						<button
							type="button"
							role="menuitem"
							class="block text-gray-800"
							onclick={() => {
								close();
								void rotateLink();
							}}
						>
							{m.rotate_access_link()}
						</button>
					{/if}
					<button
						type="button"
						role="menuitem"
						class="block text-red-600"
						onclick={() => {
							close();
							void removeJudge();
						}}
					>
						{m.remove_judge()}
					</button>
				{/snippet}
			</RowOverflowMenu>
		</div>
	</div>
</div>
