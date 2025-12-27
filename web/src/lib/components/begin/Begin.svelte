<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { setLocale, getLocale, type Locale } from '$lib/paraglide/runtime';
	import { app, AppUI, dialogs } from '$lib/index.svelte';

	let judgesRoomUrl = $state('');

	async function handleStartNewEvent() {
		AppUI.appPhase = 'event_setup';
	}

	async function handleJoinJudgesRoom() {
		if (!judgesRoomUrl.trim()) {
			dialogs.showAlert({
				title: m.white_these_swan_attend(),
				message: m.knotty_brave_nils_ascend()
			});
			return;
		}

		try {
			// Stay in joining state - App will request sync automatically when connected
			// UI will update via reactive app.hasAppData() when sync completes
			AppUI.appPhase = 'joining_judges_room';
			await app.leaveJudgesRoom();
			await app.joinJudgesRoomFromUrl(judgesRoomUrl);
		} catch (error) {
			console.error("Error joining Judges' Room:", error);
			AppUI.appPhase = 'begin';
			dialogs.showAlert({
				title: m.nimble_fine_sheep_bubble(),
				message: m.fine_game_firefox_spin({ error: error + '' })
			});
		}
	}

	function handleLanguageChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const language = target.value;
		setLocale(language as Locale, { reload: true });
	}
</script>

<svelte:head>
	<title>{m.begin()} | Judges' Room</title>
</svelte:head>

<div class="flex h-screen flex-col bg-slate-100">
	<div class="flex flex-1 flex-col items-center justify-center p-8">
		<div class="flex w-full max-w-3xl flex-col items-center gap-6">
			<div class="flex flex-col items-center justify-center gap-2">
				<h2 class="text-3xl font-medium text-gray-900">judgesroom.com</h2>

				<p class="text-center text-gray-700">
					{m.quaint_stock_seahorse_fetch()}
				</p>
			</div>

			<div class="max-w-lg rounded-2xl bg-white p-4 shadow-sm sm:p-6">
				<h3 class="text-2xl font-medium text-gray-900">{m.minor_early_hedgehog_amuse()}</h3>
				<p class="mb-2 mt-4 text-sm leading-relaxed text-gray-700">
					{m.still_honest_koala_dance()}
				</p>
				<div class="mb-6 space-y-4">
					<input type="text" bind:value={judgesRoomUrl} placeholder={m.direct_brave_pug_boil()} class="classic w-full" />
					<button onclick={handleJoinJudgesRoom} class="primary w-full">{m.mean_icy_albatross_drip()}</button>
				</div>
				<p class="text-gray-700"></p>
				<div class="mt-4 flex justify-center">
					<button
						class="cursor-pointer text-center text-sm text-gray-500 underline hover:text-gray-800 active:text-gray-900"
						onclick={handleStartNewEvent}
					>
						{m.round_heavy_turtle_explore()}
					</button>
				</div>
			</div>
		</div>
		<!-- <a class="mt-4 text-sm text-gray-500 hover:text-gray-800 active:text-gray-900" href="./privacy" target="_blank"
			>See how your data and judging materials are managed...</a
		> -->
		<div class="mt-4 flex max-w-2xl flex-row flex-wrap justify-center gap-2 text-sm text-gray-500">
			<!-- <a href="./privacy" target="_blank"> See how your data and judging materials are managed... </a> -->
			<a href="https://github.com/Jerrylum/judgesroom.com" target="_blank">{m.source_code()}</a>
			|
			<a href="https://www.tldrlegal.com/license/gnu-general-public-license-v3-gpl-3" target="_blank">{m.license()}</a>
			|
			<a href="./privacy" target="_blank">{m.data_protection_and_privacy()}</a> |
			<a href="https://discord.gg/BpSDTgq7Zm" target="_blank">{m.discord_support()}</a> |
			<a href="https://www.youtube.com/channel/UCu1sG0NWOTJMN25XpuFsttQ" target="_blank">{m.youtube_channel()}</a>
		</div>
	</div>
</div>

<div class="fixed right-4 top-4 p-1">
	<select onchange={handleLanguageChange} value={getLocale()}>
		<option value="en">English</option>
		<option value="zh-hk">繁體中文 (香港)</option>
	</select>
</div>

<style lang="postcss">
	@reference 'tailwindcss';

	a {
		@apply text-gray-500 underline hover:text-gray-800 active:text-gray-900;
	}
</style>
