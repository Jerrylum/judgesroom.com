<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { htmlM } from '$lib/i18n';
	import { createJudgeFromString } from '$lib/judging.svelte';
	import { type User } from '$lib/user.svelte';
	import { app, AppUI } from '$lib/index.svelte';
	import type { ConnectionState } from '@judgesroom.com/wrpc/client';

	let connectionState: ConnectionState = $derived(app.getConnectionState());
	let selectedJudgeId = $state('');
	let selectedRole: 'judge' | 'judge_advisor' = $state('judge');
	let newJudgeName = $state('');
	let showNameInput = $state(false);
	let selectedJudgeGroupId = $state('');
	let enableGoogleAnalytics = $state(true);

	const essentialData = $derived(app.getEssentialData());

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

	// Sync Google Analytics state
	$effect(() => {
		app.getPreferences().set('isGoogleAnalyticsEnabled', enableGoogleAnalytics);
	});
</script>

<svelte:head>
	<title>{m.role_selection()} | Judges' Room</title>
</svelte:head>

<div class="flex h-screen flex-col bg-slate-100">
	<div class="flex flex-1 flex-col items-center justify-center p-2">
		<div class="flex w-full max-w-3xl flex-col items-center gap-6">
			<div class="flex flex-col items-center justify-center gap-2">
				<h2 class="text-3xl font-medium text-gray-900">judgesroom.com</h2>

				<p class="text-center text-gray-700">
					{m.quaint_stock_seahorse_fetch()}
				</p>
			</div>

			{#if !essentialData}
				<div class="text-center text-gray-500">
					<p>{m.loading_judges_room_data_description()}</p>
				</div>
			{:else if connectionState === 'connecting' || connectionState === 'reconnecting'}
				<div class="rounded-lg bg-yellow-50 p-4 text-center text-yellow-700">
					<p>{m.connecting_to_judges_room_description()}</p>
				</div>
			{:else}
				<div class="max-w-2xl rounded-2xl bg-white p-4 shadow-sm sm:p-6">
					<!-- Role Selection -->
					<div class="space-y-6">
						<div class="space-y-4">
							<h3 class="text-2xl font-medium text-gray-900">{m.join_judges_room()}</h3>
							<p class="mb-2 mt-4 text-sm leading-relaxed text-gray-700">
								{@html htmlM.you_are_connected_to({ eventName: essentialData.eventName, divisionId: essentialData.divisionId ?? '' })}
							</p>
							<p class="mb-2 mt-2 text-sm leading-relaxed text-gray-700">
								{m.choose_your_identity_to_start_participating_in_the_judges_room()}
							</p>
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
										<div class="font-medium text-gray-900">{m.judge()}</div>
										<div class="text-sm text-gray-500">{m.evaluate_teams_and_participate_in_scoring()}</div>
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
										<div class="font-medium text-gray-900">{m.judge_advisor()}</div>
										<div class="text-sm text-gray-500">{m.manage_the_judges_room_and_oversee_judges()}</div>
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
											{m.find_my_name()}
										</button>
										<button
											onclick={toggleNameInput}
											class="rounded-md px-3 py-1 text-sm font-medium transition-colors"
											class:bg-white={showNameInput}
											class:text-gray-900={showNameInput}
											class:text-gray-500={!showNameInput}
										>
											{m.cant_find_your_name()}
										</button>
									</div>
								</div>

								{#if !showNameInput}
									<!-- Select Existing Judge -->
									<div class="space-y-4">
										{#if Object.keys(judgesByGroup()).length === 0}
											<div class="py-8 text-center text-gray-500">
												<p>{m.no_judges_have_been_set_up_yet()}</p>
												<p class="text-sm">{m.you_can_add_your_name_instead()}</p>
											</div>
										{:else}
											<div class="space-y-4">
												{#each judgeGroups as group (group.id)}
													{@const judges = judgesByGroup()[group.id] || []}
													<div class="rounded-lg border bg-gray-50 p-4">
														<h4 class="mb-2 font-medium text-gray-900">{group.name}</h4>

														{#if judges.length === 0}
															<p class="text-sm text-gray-500">{m.no_judges_in_this_group()}</p>
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
													{m.continue_as_selected_judge()}
												</button>
											</div>
										{/if}
									</div>
								{:else}
									<!-- Add New Judge -->
									<div class="space-y-4">
										<div class="space-y-4">
											<div>
												<label for="judgeName" class="block text-sm font-medium text-gray-700">{m.your_name()}</label>
												<input
													id="judgeName"
													type="text"
													bind:value={newJudgeName}
													placeholder="Enter your name"
													class="classic mt-1 block w-full"
												/>
											</div>

											<div>
												<label for="judgeGroup" class="block text-sm font-medium text-gray-700">{m.judge_group()}</label>
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
													{m.continue_with_this_name()}
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
									<h4 class="font-medium text-gray-900">{m.judge_advisor()}</h4>
									<p class="mt-2 text-sm text-gray-600">
										{m.as_a_judge_advisor_you_can()}
									</p>
									<div class="mt-4">
										<button
											onclick={selectJudgeAdvisor}
											class="rounded-md bg-slate-600 px-6 py-2 text-white transition-colors hover:bg-slate-700"
										>
											{m.continue_as_judge_advisor()}
										</button>
									</div>
								</div>
							</div>
						{/if}
						<label class="flex cursor-pointer items-start space-x-3">
							<input type="checkbox" bind:checked={enableGoogleAnalytics} class="mt-1" />
							<div class="flex-1">
								<div class="text-sm font-medium text-gray-900">{m.enable_google_analytics()}</div>
								<p class="mt-1 text-xs text-gray-600">
									{m.help_us_improve_judgesroom_com_short()}
								</p>
							</div>
						</label>
					</div>
				</div>
			{/if}
		</div>

		<div class="mt-4 flex max-w-2xl flex-row flex-wrap justify-center gap-2 text-sm text-gray-500">
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

<style lang="postcss">
	@reference 'tailwindcss';

	a {
		@apply text-gray-500 underline hover:text-gray-800 active:text-gray-900;
	}
</style>
