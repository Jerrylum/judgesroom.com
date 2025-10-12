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
			errorMessage = "Please enter a Judges' Room URL";
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
		}
	}
</script>

<svelte:head>
	<title>Begin | Judges' Room</title>
</svelte:head>

<div class="flex h-screen flex-col bg-slate-100">
	<div class="flex flex-1 flex-col items-center justify-center p-8">
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

		<div class="flex w-full max-w-3xl flex-col items-center gap-6">
			<div class="flex flex-col items-center justify-center gap-2">
				<h2 class="text-3xl font-medium text-gray-900">judgesroom.com</h2>

				<p class="text-center text-gray-700">
					An open-source judging system designed for judges and judge advisors to evaluate teams and conduct award deliberations for the VEX
					Robotics Competition.
				</p>
			</div>

			<div class="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
				<h3 class="text-2xl font-medium text-gray-900">Join Judges' Room</h3>
				<p class="mb-2 mt-4 leading-relaxed text-gray-700">Join an existing Judges' Room using a link from your judge advisor.</p>
				<div class="mb-6 space-y-4">
					<input type="text" bind:value={judgesRoomUrl} placeholder="Paste the invite link here..." class="classic w-full" />
					<button onclick={handleJoinJudgesRoom} class="primary w-full">Join</button>
				</div>
				<div class="rounded-lg bg-gray-50 p-4 text-sm">
					<p class="mb-2 font-semibold text-gray-800">How to get a Judges' Room link:</p>
					<ol class="list-inside list-decimal space-y-1 text-gray-600">
						<li>Ask your judge advisor for the Judges' Room link</li>
						<li>They can share it via QR code or copy/paste</li>
						<li>Paste the link above and click "Join"</li>
					</ol>
				</div>
				<div class="mt-4 flex justify-center">
					<button
						class="cursor-pointer text-center text-sm text-gray-500 hover:text-gray-800 active:text-gray-900"
						onclick={handleStartNewEvent}
						aria-label="Start a new one"
					>
						Or start a new one
					</button>
				</div>
			</div>
		</div>
		<a class="mt-4 text-sm text-gray-500 hover:text-gray-800 active:text-gray-900" href="./privacy" target="_blank"
			>See how your data and judging materials are managed...</a
		>
	</div>
</div>
