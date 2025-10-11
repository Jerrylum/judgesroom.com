<script lang="ts">
	import { app, AppUI } from '$lib/app-page.svelte';

	interface Props {
		errorMessage: string;
	}

	let { errorMessage = $bindable() }: Props = $props();

	let judgesRoomUrl = $state('');

	function clearError() {
		errorMessage = '';
	}

	async function handleStartNewEvent() {
		AppUI.appPhase = 'event_setup';
	}

	async function handleJoinJudgesRoom() {
		if (!judgesRoomUrl.trim()) {
			errorMessage = 'Please enter a Judges\' Room URL';
			return;
		}

		try {
			// Stay in joining state - App will request sync automatically when connected
			// UI will update via reactive app.hasAppData() when sync completes
			AppUI.appPhase = 'joining_judges_room';
			await app.leaveJudgesRoom();
			await app.joinJudgesRoomFromUrl(judgesRoomUrl);
		} catch (error) {
			console.error('Error joining Judges\' Room:', error);
			AppUI.appPhase = 'choose_action';
		}
	}
</script>

<div class="flex flex-1 flex-col items-center justify-center p-8 text-black">
	<h1 class="mb-8 text-center text-4xl font-bold drop-shadow-lg md:text-5xl">JudgesRoom.com</h1>

	{#if errorMessage}
		<div class="mb-8 flex w-full max-w-2xl items-center gap-4 rounded-lg border-2 border-red-600 bg-red-500/90 p-4" role="alert">
			<p class="flex-1 text-white">{errorMessage}</p>
			<button
				onclick={clearError}
				class="flex h-6 w-6 items-center justify-center text-xl text-white transition-colors hover:text-red-200"
				aria-label="Clear error"
			>
				×
			</button>
		</div>
	{/if}

	<div class="grid w-full max-w-4xl grid-cols-1 gap-8 lg:grid-cols-2">
		<div class="rounded-2xl bg-white/95 p-8 shadow-lg backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:transform">
			<h2 class="mb-4 flex items-center gap-2 text-2xl font-bold text-slate-600">🎯 Start New Event</h2>
			<p class="mb-6 leading-relaxed text-gray-700">Set up a new competition event with teams, judges, and awards.</p>
			<button onclick={handleStartNewEvent} class="primary w-full">Start Event Setup</button>
		</div>

		<div class="rounded-2xl bg-white/95 p-8 shadow-lg backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:transform">
			<h2 class="mb-4 flex items-center gap-2 text-2xl font-bold text-slate-600">🔗 Join Judges' Room</h2>
			<p class="mb-6 leading-relaxed text-gray-700">Join an existing Judges' Room using a link from your judge advisor.</p>
			<div class="mb-6 space-y-4">
				<input type="text" bind:value={judgesRoomUrl} placeholder="Paste Judges' Room URL here..." class="classic w-full" />
				<button onclick={handleJoinJudgesRoom} class="primary w-full">Join Judges' Room</button>
			</div>
			<div class="rounded-lg bg-gray-50 p-4 text-sm">
				<p class="mb-2 font-semibold text-gray-800">How to get a Judges' Room link:</p>
				<ol class="list-inside list-decimal space-y-1 text-gray-600">
					<li>Ask your judge advisor for the Judges' Room link</li>
					<li>They can share it via QR code or copy/paste</li>
					<li>Paste the link above and click "Join Judges' Room"</li>
				</ol>
			</div>
		</div>
	</div>
</div>
