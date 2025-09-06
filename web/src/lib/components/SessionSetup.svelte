<script lang="ts">
	import { app, AppUI, dialogs } from '$lib/app-page.svelte';
	import ShareDialog from './ShareDialog.svelte';

	let isCreatingSession = $state(false);

	async function createSession() {
		try {
			isCreatingSession = true;

			// Get event setup data from app's essential data
			const essentialData = app.getEssentialData();
			if (!essentialData) {
				throw new Error('No event setup data available. Please complete event setup first.');
			}

			await app.createSession();

			// For Judge Advisor who created the session, auto-select role and show share dialog
			app.selectUser({ role: 'judge_advisor' });
			AppUI.appPhase = 'workspace';
			dialogs.showCustom(ShareDialog, {
				props: {},
				maxWidth: 'max-w-4xl'
			});
		} catch (error) {
			console.error('Failed to create session:', error);
		} finally {
			isCreatingSession = false;
		}
	}

	// function continueOffline() {
	// 	const firstJudgeGroup = app.getJudgeGroups()[0];
	// 	const allJudges = app.getAllJudges();

	// 	// Look for existing "Default Judge"
	// 	let defaultJudge = allJudges.find((judge) => judge.name === 'Default Judge');

	// 	if (defaultJudge) {
	// 		// Use existing Default Judge, but ensure it's in the first judge group
	// 		if (defaultJudge.groupId !== firstJudgeGroup.id) {
	// 			defaultJudge = { ...defaultJudge, groupId: firstJudgeGroup.id };
	// 			app.updateJudge(defaultJudge);
	// 		}
	// 	} else {
	// 		// Create new Default Judge if none exists
	// 		defaultJudge = {
	// 			id: uuidv4(),
	// 			name: 'Default Judge',
	// 			groupId: firstJudgeGroup.id
	// 		};
	// 	}

	// 	// For Judge Advisor who created the session, switch to judge role
	// 	app.selectUser({
	// 		role: 'judge',
	// 		judge: defaultJudge
	// 	});
	// 	AppUI.appPhase = 'workspace';
	// }
</script>

<div class="flex flex-1 flex-col items-center justify-center p-8">
	<div class="w-full max-w-4xl">
		<div class="space-y-6">
			<div class="text-center">
				<h2 class="text-2xl font-semibold text-gray-900">Choose Your Mode</h2>
				<p class="mt-2 text-gray-600">Select how you'd like to proceed with judging.</p>
			</div>

			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				<!-- Online Collaboration Option -->
				<div class="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-6">
					<div class="text-center">
						<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
							<svg class="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2m-2-4H9m4 0V9a3 3 0 00-6 0v3m0 0v6a2 2 0 002 2h4a2 2 0 002-2v-3"
								></path>
							</svg>
						</div>
						<h3 class="text-lg font-medium text-gray-900">Online Collaboration</h3>
						<p class="mt-2 text-sm text-gray-600">
							Create a secure session for multiple judges to collaborate in real-time. All data is end-to-end encrypted.
						</p>

						<!-- Create session button -->
						<div class="mt-4">
							<button
								onclick={createSession}
								disabled={isCreatingSession}
								class="w-full rounded-md bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
							>
								{isCreatingSession ? 'Creating Session...' : 'Create Session'}
							</button>
						</div>
					</div>
				</div>

				<!-- Offline Option -->
				<!-- <div class="rounded-lg border-2 border-gray-200 bg-gray-50 p-6">
					<div class="text-center">
						<div
							class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100"
						>
							<svg
								class="h-6 w-6 text-gray-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
								></path>
							</svg>
						</div>
						<h3 class="text-lg font-medium text-gray-900">Work Offline</h3>
						<p class="mt-2 text-sm text-gray-600">
							Use the judging system locally on this device only. No internet connection required.
						</p>

						<div class="mt-4">
							<button
								onclick={continueOffline}
								class="w-full rounded-md bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
							>
								Continue Offline
							</button>
						</div>
					</div>
				</div> -->
			</div>

			<div class="text-center text-sm text-gray-500">
				<p>You can always switch between online and offline modes later.</p>
			</div>
		</div>
	</div>
</div>
