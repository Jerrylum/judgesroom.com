<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { app } from '$lib/index.svelte';
	import DenialIcon from '$lib/icon/DenialIcon.svelte';
	import JudgeGroupSection from './JudgeGroupSection.svelte';
	import { buildAccessLinksCsv, downloadTextFile } from '$lib/judges-csv';
	import type { AccessLinks } from '@judgesroom.com/protocol/src/access';
	import { onMount } from 'svelte';

	interface Props {
		isActive?: boolean;
	}

	let { isActive = false }: Props = $props();

	let searchQuery = $state('');
	let accessLinks = $state<AccessLinks | null>(null);
	let loadingLinks = $state(false);
	let selectedRowKey = $state<string | null>(null);

	function selectRow(rowKey: string | null) {
		selectedRowKey = rowKey;
	}

	const accessControlEnabled = $derived(app.isAccessControlEnabled());
	const connectionState = $derived(app.getConnectionState());
	const isDisconnectedFromServer = $derived(connectionState !== 'connected');
	const judgeGroups = $derived(app.getAllJudgeGroups());

	const authTokensByJudgeId = $derived.by(() => {
		const map: Record<string, string> = {};
		for (const judge of accessLinks?.judges ?? []) {
			map[judge.judgeId] = judge.authToken;
		}
		return map;
	});

	async function loadAccessLinks() {
		if (!accessControlEnabled) {
			accessLinks = null;
			return;
		}
		loadingLinks = true;
		try {
			accessLinks = await app.wrpcClient.access.listAccessLinks.query();
		} catch (error) {
			console.error('Failed to load access links:', error);
		} finally {
			loadingLinks = false;
		}
	}

	function downloadCsv() {
		if (!accessLinks) return;
		const groupsById = Object.fromEntries(judgeGroups.map((group) => [group.id, group.name]));
		const judges = app.getAllJudges();
		const rows = [
			{
				role: m.judge_advisor(),
				name: m.judge_advisor(),
				group: '',
				accessLink: app.getJudgesRoomUrl(accessLinks.judgeAdvisorAuthToken)
			},
			...accessLinks.judges.map((judge) => {
				const rosterJudge = judges.find((j) => j.id === judge.judgeId);
				return {
					role: m.judge(),
					name: judge.name,
					group: rosterJudge ? (groupsById[rosterJudge.groupId] ?? '') : '',
					accessLink: app.getJudgesRoomUrl(judge.authToken)
				};
			})
		];
		downloadTextFile('judges-access-links.csv', buildAccessLinksCsv(rows));
	}

	onMount(() => {
		void loadAccessLinks();
	});

	$effect(() => {
		if (!isActive) return;
		app.retainDeviceList();
		return () => {
			app.releaseDeviceList();
		};
	});
</script>

<div class="h-full overflow-auto p-2 md:p-6">
	<div class="mx-auto max-w-5xl space-y-2 md:space-y-6">
		<div class="rounded-lg bg-white p-6 shadow-sm">
			<div class="flex flex-col items-start justify-between gap-3 sm:flex-row">
				<div>
					<h2 class="text-lg font-medium text-gray-900">{m.judges_tab_title()}</h2>
					<p class="mt-2 text-sm text-gray-600">{m.judges_tab_description()}</p>
				</div>
				{#if accessControlEnabled}
					<button type="button" class="primary tiny shrink-0" onclick={downloadCsv} disabled={!accessLinks || loadingLinks}>
						{m.download_access_links_csv()}
					</button>
				{/if}
			</div>

			{#if isDisconnectedFromServer}
				<div class="mt-4 rounded-lg bg-red-50 p-4">
					<div class="flex items-center space-x-2 text-red-800">
						<DenialIcon />
						<div>
							<h5 class="font-medium">{m.connection_error()}</h5>
							<p class="text-sm">{m.you_are_disconnected_from_the_server()}</p>
						</div>
					</div>
				</div>
			{/if}

			<div class="mt-4">
				<label class="mb-1 block text-sm font-medium text-gray-700" for="judges-search">{m.search_judges_and_teams()}</label>
				<input
					id="judges-search"
					type="search"
					bind:value={searchQuery}
					placeholder={m.search_judges_and_teams()}
					class="classic block w-full"
				/>
			</div>
			{#if accessControlEnabled}
				<p class="mt-2 text-xs text-gray-500">{m.download_access_links_csv_hint()}</p>
			{/if}
		</div>

		{#each judgeGroups as group (group.id)}
			<JudgeGroupSection
				groupId={group.id}
				{authTokensByJudgeId}
				{searchQuery}
				{selectedRowKey}
				onSelectRow={selectRow}
				onAccessLinksChanged={loadAccessLinks}
			/>
		{/each}
	</div>
</div>
