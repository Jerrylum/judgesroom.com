<script lang="ts">
	import { createJudgeFromString } from '$lib/judging.svelte';
	import { type User } from '$lib/user.svelte';
	import { app, AppUI } from '$lib/index.svelte';
	import type { ConnectionState } from '@judging.jerryio/wrpc/client';

	let connectionState: ConnectionState = $derived(app.getConnectionState());
	let selectedJudgeId = $state('');
	let selectedRole: 'judge' | 'judge_advisor' = $state('judge');
	let newJudgeName = $state('');
	let showNameInput = $state(false);
	let selectedJudgeGroupId = $state('');

	// Get all existing judges grouped by judge group
	const judgesByGroup = $derived(() => app.getExistingJudgesGroupedByGroup());

	const judgeGroups = $derived(app.getAllJudgeGroups());

	async function selectExistingJudge() {
		if (!selectedJudgeId || !app.hasEssentialData()) return;

		const judge = app.findJudgeById(selectedJudgeId);
		if (judge) {
			const user: User = { role: 'judge', judge };
			await app.selectUser(user);
			AppUI.appPhase = 'workspace';
		}
	}

	async function selectJudgeAdvisor() {
		const user: User = { role: 'judge_advisor' };
		await app.selectUser(user);
		AppUI.appPhase = 'workspace';
	}

	async function createNewJudge() {
		if (!newJudgeName.trim() || !selectedJudgeGroupId) return;

		try {
			const newJudge = createJudgeFromString(newJudgeName.trim(), selectedJudgeGroupId);
			const user: User = { role: 'judge', judge: newJudge };
			await app.selectUser(user);
			AppUI.appPhase = 'workspace';
		} catch (error) {
			console.error('Failed to create new judge:', error);
		}
	}

	function toggleNameInput() {
		showNameInput = !showNameInput;
		selectedJudgeId = '';
		newJudgeName = '';
		selectedJudgeGroupId = '';
	}

	function handleRoleChange() {
		selectedJudgeId = '';
		newJudgeName = '';
		showNameInput = false;
	}

	// Initialize with first judge group if available
	$effect(() => {
		if (judgeGroups.length > 0 && !selectedJudgeGroupId) {
			selectedJudgeGroupId = judgeGroups[0].id;
		}
	});

	// Handle disconnection, kicked, or Judges' Room destroyed scenarios
	$effect(() => {
		// If we lose connection or have errors, redirect to choose action
		if (connectionState === 'error' || connectionState === 'offline') {
			AppUI.appPhase = 'begin';
		}
	});
</script>

<svelte:head>
	<title>Role Selection | Judges' Room</title>
</svelte:head>

<div class="flex flex-1 flex-col items-center justify-center p-8">
	<div class="w-full max-w-4xl">
		<div class="space-y-6">
			<div class="text-center">
				<h2 class="text-2xl font-semibold text-gray-900">Select Your Role</h2>
				<p class="mt-2 text-gray-600">Choose your identity to start participating in the Judges' Room.</p>

				{#if connectionState !== 'offline'}
					<div class="mt-2 text-sm">
						Connection Status:
						<span
							class="font-medium"
							class:text-green-600={connectionState === 'connected'}
							class:text-yellow-600={connectionState === 'connecting' || connectionState === 'reconnecting'}
							class:text-red-600={connectionState === 'error'}
						>
							{connectionState}
						</span>
					</div>
				{/if}
			</div>

			{#if !app.hasEssentialData()}
				<div class="text-center text-gray-500">
					<p>Loading Judges' Room data...</p>
				</div>
			{:else if connectionState === 'connecting' || connectionState === 'reconnecting'}
				<div class="rounded-lg bg-yellow-50 p-4 text-center text-yellow-700">
					<p>Connecting to Judges' Room...</p>
				</div>
			{:else}
				<div class="space-y-6">
					<!-- Role Selection -->
					<div class="space-y-4">
						<h3 class="text-lg font-medium text-gray-900">I am a...</h3>
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<label
								class="flex cursor-pointer items-center space-x-3 rounded-lg border-2 p-4 transition-colors"
								class:border-slate-500={selectedRole === 'judge'}
								class:bg-slate-50={selectedRole === 'judge'}
								class:border-gray-200={selectedRole !== 'judge'}
							>
								<input
									type="radio"
									bind:group={selectedRole}
									value="judge"
									onchange={handleRoleChange}
									class="text-slate-600 focus:ring-slate-500"
								/>
								<div>
									<div class="font-medium text-gray-900">Judge</div>
									<div class="text-sm text-gray-500">Evaluate teams and participate in scoring</div>
								</div>
							</label>

							<label
								class="flex cursor-pointer items-center space-x-3 rounded-lg border-2 p-4 transition-colors"
								class:border-slate-500={selectedRole === 'judge_advisor'}
								class:bg-slate-50={selectedRole === 'judge_advisor'}
								class:border-gray-200={selectedRole !== 'judge_advisor'}
							>
								<input
									type="radio"
									bind:group={selectedRole}
									value="judge_advisor"
									onchange={handleRoleChange}
									class="text-slate-600 focus:ring-slate-500"
								/>
								<div>
									<div class="font-medium text-gray-900">Judge Advisor</div>
									<div class="text-sm text-gray-500">Manage the Judges' Room and oversee judges</div>
								</div>
							</label>
						</div>
					</div>

					{#if selectedRole === 'judge'}
						<!-- Judge Selection -->
						<div class="space-y-4">
							<!-- Toggle between existing and new judge -->
							<div class="flex justify-center">
								<div class="flex rounded-lg bg-gray-100 p-1">
									<button
										onclick={toggleNameInput}
										class="rounded-md px-3 py-1 text-sm font-medium transition-colors"
										class:bg-white={!showNameInput}
										class:text-gray-900={!showNameInput}
										class:text-gray-500={showNameInput}
									>
										Find My Name
									</button>
									<button
										onclick={toggleNameInput}
										class="rounded-md px-3 py-1 text-sm font-medium transition-colors"
										class:bg-white={showNameInput}
										class:text-gray-900={showNameInput}
										class:text-gray-500={!showNameInput}
									>
										Can't Find Your Name?
									</button>
								</div>
							</div>

							{#if !showNameInput}
								<!-- Select Existing Judge -->
								<div class="space-y-4">
									{#if Object.keys(judgesByGroup()).length === 0}
										<div class="py-8 text-center text-gray-500">
											<p>No judges have been set up yet.</p>
											<p class="text-sm">You can add your name instead.</p>
										</div>
									{:else}
										<div class="space-y-4">
											{#each judgeGroups as group (group.id)}
												{@const judges = judgesByGroup()[group.id] || []}
												<div class="rounded-lg border bg-gray-50 p-4">
													<h4 class="mb-2 font-medium text-gray-900">{group.name}</h4>

													{#if judges.length === 0}
														<p class="text-sm text-gray-500">No judges in this group</p>
													{:else}
														<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
															{#each judges as judge (judge.id)}
																<label class="flex cursor-pointer items-center space-x-2">
																	<input
																		type="radio"
																		bind:group={selectedJudgeId}
																		value={judge.id}
																		class="text-slate-600 focus:ring-slate-500"
																	/>
																	<span class="text-sm">{judge.name}</span>
																</label>
															{/each}
														</div>
													{/if}
												</div>
											{/each}
										</div>

										<div class="text-center">
											<button
												onclick={selectExistingJudge}
												disabled={!selectedJudgeId}
												class="rounded-md bg-slate-600 px-6 py-2 text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
											>
												Continue as Selected Judge
											</button>
										</div>
									{/if}
								</div>
							{:else}
								<!-- Add New Judge -->
								<div class="space-y-4">
									<div class="space-y-4">
										<div>
											<label for="judgeName" class="block text-sm font-medium text-gray-700">Your Name </label>
											<input
												id="judgeName"
												type="text"
												bind:value={newJudgeName}
												placeholder="Enter your name"
												class="classic mt-1 block w-full"
											/>
										</div>

										<div>
											<label for="judgeGroup" class="block text-sm font-medium text-gray-700">Judge Group </label>
											<select id="judgeGroup" bind:value={selectedJudgeGroupId} class="classic mt-1 block w-full">
												{#each judgeGroups as group (group.id)}
													<option value={group.id}>{group.name}</option>
												{/each}
											</select>
										</div>

										<div class="text-center">
											<button
												onclick={createNewJudge}
												disabled={!newJudgeName.trim() || !selectedJudgeGroupId}
												class="rounded-md bg-slate-600 px-6 py-2 text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
											>
												Continue with This Name
											</button>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{:else if selectedRole === 'judge_advisor'}
						<!-- Judge Advisor Selection -->
						<div class="space-y-4">
							<div class="rounded-lg border bg-slate-50 p-4 text-center">
								<h4 class="font-medium text-gray-900">Judge Advisor</h4>
								<p class="mt-2 text-sm text-gray-600">
									As a Judge Advisor, you can manage the Judges' Room, oversee all judges, and access all judging data.
								</p>
								<div class="mt-4">
									<button
										onclick={selectJudgeAdvisor}
										class="rounded-md bg-slate-600 px-6 py-2 text-white transition-colors hover:bg-slate-700"
									>
										Continue as Judge Advisor
									</button>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<div class="text-center text-sm text-gray-500">
				<p>You can change your role at any time.</p>
			</div>
		</div>
	</div>
</div>
