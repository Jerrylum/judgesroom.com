<script lang="ts">
	import { createJudgeFromString } from '$lib/judging.svelte';
	import { type User } from '$lib/user.svelte';
	import { app, dialogs } from '$lib/app-page.svelte';
	import type { ConnectionState } from '@judging.jerryio/wrpc/client';
	import Dialog from '$lib/components/dialog/Dialog.svelte';
	import CloseIcon from '$lib/icon/CloseIcon.svelte';

	let connectionState: ConnectionState = $derived(app.getConnectionState());
	let selectedJudgeId = $state('');
	let selectedRole: 'judge' | 'judge_advisor' = $state('judge');
	let newJudgeName = $state('');
	let showNameInput = $state(false);
	let selectedJudgeGroupId = $state('');

	// Get all existing judges grouped by judge group
	const judgesByGroup = $derived(() => app.getExistingJudgesGroupedByGroup());

	const judgeGroups = $derived(app.getAllJudgeGroups());

	function handleClose() {
		dialogs.closeDialog();
	}

	async function selectExistingJudge() {
		if (!selectedJudgeId || !app.hasEssentialData()) return;

		const judge = app.findJudgeById(selectedJudgeId);
		if (judge) {
			const user: User = { role: 'judge', judge };
			await app.selectUser(user);
			dialogs.closeDialog();
		}
	}

	async function selectJudgeAdvisor() {
		const user: User = { role: 'judge_advisor' };
		await app.selectUser(user);
		dialogs.closeDialog();
	}

	async function createNewJudge() {
		if (!newJudgeName.trim() || !selectedJudgeGroupId) return;

		try {
			const newJudge = createJudgeFromString(newJudgeName.trim(), selectedJudgeGroupId);
			const user: User = { role: 'judge', judge: newJudge };
			await app.selectUser(user);
			dialogs.closeDialog();
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
</script>

<Dialog open={true} onClose={handleClose} innerContainerClass="max-w-2xl">
	<div class="space-y-6">
		<!-- Title -->
		<div class="flex flex-col">
			<div class="flex items-center justify-between">
				<h3 id="dialog-title" class="text-lg font-semibold text-gray-900">Switch Role</h3>
				<button
					onclick={handleClose}
					class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
					aria-label="Close dialog"
				>
					<CloseIcon size={24} />
				</button>
			</div>
			<p class="text-sm text-gray-600">Choose your new identity for the judging session.</p>
		</div>
		{#if !app.hasEssentialData()}
			<div class="text-center text-gray-500">
				<p>Loading session data...</p>
			</div>
		{:else if connectionState === 'connecting' || connectionState === 'reconnecting'}
			<div class="rounded-lg bg-yellow-50 p-4">
				<p class="text-sm text-yellow-700">Connecting to session...</p>
			</div>
		{:else if connectionState === 'error'}
			<div class="rounded-lg bg-red-50 p-4">
				<p class="text-sm text-red-700">Connection error. Please try again.</p>
			</div>
		{:else}
			<div class="space-y-6">
				<!-- Role Selection -->
				<div class="space-y-4">
					<h4 class="text-base font-medium text-gray-900">I am a...</h4>
					<div class="flex flex-col gap-2">
						<label
							class="flex cursor-pointer items-center space-x-3 rounded-lg border-2 p-3 transition-colors"
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
							class="flex cursor-pointer items-center space-x-3 rounded-lg border-2 p-3 transition-colors"
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
								<div class="text-sm text-gray-500">Manage the judging session and oversee judges</div>
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
									<div class="rounded-lg bg-gray-50 p-4">
										<p class="text-sm text-gray-500">No judges have been set up yet.</p>
										<p class="mt-1 text-xs text-gray-400">You can add your name instead.</p>
									</div>
								{:else}
									<div class="max-h-60 space-y-3 overflow-y-auto">
										{#each judgeGroups as group (group.id)}
											{@const judges = judgesByGroup()[group.id] || []}
											<div class="rounded-lg border bg-gray-50 p-3">
												<h4 class="mb-2 font-medium text-gray-900">{group.name}</h4>

												{#if judges.length === 0}
													<p class="text-sm text-gray-500">No judges in this group</p>
												{:else}
													<div class="grid grid-cols-1 gap-1 sm:grid-cols-2">
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

									<div class="flex justify-end">
										<button onclick={selectExistingJudge} disabled={!selectedJudgeId} class="primary"> Continue as Selected Judge </button>
									</div>
								{/if}
							</div>
						{:else}
							<!-- Add New Judge -->
							<div class="space-y-4">
								<div class="space-y-3">
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

									<div class="flex justify-end">
										<button onclick={createNewJudge} disabled={!newJudgeName.trim() || !selectedJudgeGroupId} class="primary">
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
						<div class="rounded-lg border bg-slate-50 p-4">
							<h4 class="font-medium text-gray-900">Judge Advisor</h4>
							<p class="mt-2 text-sm text-gray-600">
								As a Judge Advisor, you can manage the judging session, oversee all judges, and access all judging data.
							</p>
						</div>
						<div class="flex justify-end">
							<button onclick={selectJudgeAdvisor} class="primary"> Continue as Judge Advisor </button>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</Dialog>
