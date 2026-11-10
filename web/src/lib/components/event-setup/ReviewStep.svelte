<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { app, dialogs } from '$lib/index.svelte';
	import { rubricScoreStepOptions } from '@judgesroom.com/protocol/src/event';
	import RemoveAwardsDialog from './RemoveAwardsDialog.svelte';

	interface Props {
		onPrev: () => void;
		onComplete: () => Promise<void>;
		onJumpToStep: (step: number) => void;
		removedAwardNames?: string[];
		blockers?: { step: number; label: string }[];
		isJudgesRoomJoined: boolean;
		accessControlEnabled?: boolean;
		notebookRubricScoreStep?: number;
		interviewRubricScoreStep?: number;
		onAccessControlEnabledChange?: (value: boolean) => void;
	}

	let {
		onPrev,
		onComplete,
		onJumpToStep,
		removedAwardNames = [],
		blockers = [],
		isJudgesRoomJoined,
		accessControlEnabled = $bindable(false),
		notebookRubricScoreStep = $bindable(0.1),
		interviewRubricScoreStep = $bindable(0.1),
		onAccessControlEnabledChange
	}: Props = $props();

	const notebookScoreStepOptions = $derived(rubricScoreStepOptions(notebookRubricScoreStep));
	const interviewScoreStepOptions = $derived(rubricScoreStepOptions(interviewRubricScoreStep));

	let enableGoogleAnalytics = $state(true);
	let isLoading = $state(false);

	async function handleAccessControlChange(input: HTMLInputElement) {
		const checked = input.checked;

		if (checked) {
			const confirmed = await dialogs.showConfirmation({
				title: m.enable_access_control_confirm_title(),
				message: isJudgesRoomJoined ? m.enable_access_control_confirm_message() : m.enable_access_control_confirm_message_new_room(),
				confirmText: m.enable_access_control_confirm_title(),
				cancelText: m.cancel(),
				confirmButtonClass: 'danger'
			});
			if (!confirmed) {
				// Browser already toggled the input; restore controlled state.
				input.checked = accessControlEnabled;
				return;
			}
		} else if (isJudgesRoomJoined) {
			const confirmed = await dialogs.showConfirmation({
				title: m.disable_access_control_confirm_title(),
				message: m.disable_access_control_confirm_message(),
				confirmText: m.disable_access_control_confirm_title(),
				cancelText: m.cancel(),
				confirmButtonClass: 'danger'
			});
			if (!confirmed) {
				input.checked = accessControlEnabled;
				return;
			}
		}

		accessControlEnabled = checked;
		onAccessControlEnabledChange?.(checked);
	}

	async function handleComplete() {
		if (removedAwardNames.length > 0) {
			const confirmed = await dialogs.showCustom(RemoveAwardsDialog, {
				props: {
					title: m.remove_saved_awards_title(),
					message: m.remove_saved_awards_message(),
					awardNames: removedAwardNames,
					detail: m.removed_awards_consequence(),
					confirmText: m.remove_awards_and_complete()
				}
			});
			if (confirmed !== true) return;
		}

		isLoading = true;
		try {
			app.getPreferences().set('isGoogleAnalyticsEnabled', enableGoogleAnalytics);
			await onComplete();
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="space-y-6">
	<h2 class="text-xl font-semibold text-gray-900">{m.other_settings()}</h2>

	<label class="block max-w-sm">
		<div class="font-medium text-gray-900">{m.notebook_rubric_score_step()}</div>
		<p class="mt-1 text-sm text-gray-600">{m.notebook_rubric_score_step_description()}</p>
		<select
			class="classic mt-2"
			value={notebookRubricScoreStep}
			disabled={isLoading}
			onchange={(event) => {
				notebookRubricScoreStep = Number(event.currentTarget.value);
			}}
		>
			{#each notebookScoreStepOptions as step (step)}
				<option value={step}>{step}</option>
			{/each}
		</select>
	</label>

	<label class="block max-w-sm">
		<div class="font-medium text-gray-900">{m.interview_rubric_score_step()}</div>
		<p class="mt-1 text-sm text-gray-600">{m.interview_rubric_score_step_description()}</p>
		<select
			class="classic mt-2"
			value={interviewRubricScoreStep}
			disabled={isLoading}
			onchange={(event) => {
				interviewRubricScoreStep = Number(event.currentTarget.value);
			}}
		>
			{#each interviewScoreStepOptions as step (step)}
				<option value={step}>{step}</option>
			{/each}
		</select>
	</label>

	<label class="flex cursor-pointer items-start space-x-3">
		<input
			type="checkbox"
			checked={accessControlEnabled}
			onchange={(event) => {
				void handleAccessControlChange(event.currentTarget as HTMLInputElement);
			}}
			class="mt-1"
			disabled={isLoading}
		/>
		<div class="flex-1">
			<div class="font-medium text-gray-900">{m.enable_access_control()}</div>
			<p class="mt-1 text-sm text-gray-600">{m.enable_access_control_description()}</p>
		</div>
	</label>

	<label class="flex cursor-pointer items-start space-x-3">
		<input type="checkbox" bind:checked={enableGoogleAnalytics} class="mt-1" disabled={isLoading} />
		<div class="flex-1">
			<div class="font-medium text-gray-900">{m.enable_google_analytics()}</div>
			<p class="mt-1 text-sm text-gray-600">
				{m.help_us_improve_judgesroom_com()}
				<a href="./privacy" target="_blank" class="text-slate-600 underline hover:text-slate-800"
					>{m.data_protection_and_privacy_policy()}</a
				>
				{m.help_us_improve_judgesroom_com_description()}
			</p>
		</div>
	</label>

	<div class="space-y-4 text-sm text-gray-700">
		<div class="space-y-2">
			<p>
				{m.review_license_description1()}
				<a href="https://discord.gg/BpSDTgq7Zm" target="_blank" class="text-slate-600 underline hover:text-slate-800"
					>{m.discord_support()}</a
				>
				{m.review_license_description2()}
				<a href="https://github.com/Jerrylum/judgesroom.com" target="_blank" class="text-slate-600 underline hover:text-slate-800"
					>{m.github_repository()}</a
				>
				{m.review_license_description3()}
			</p>
		</div>
	</div>

	{#if blockers.length > 0}
		<div class="rounded border border-yellow-400 bg-yellow-100 px-4 py-3 text-yellow-800">
			<p>{m.complete_setup_needs_steps()}</p>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each blockers as blocker (blocker.step)}
					<button type="button" class="font-medium underline" onclick={() => onJumpToStep(blocker.step)}>
						{m.go_to_step({ step: blocker.step, name: blocker.label })}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<div class="flex justify-between pt-4">
		{#if !isLoading}
			<div class="flex space-x-3">
				<button type="button" onclick={onPrev} class="secondary">{m.back()}</button>
			</div>
			<button
				type="button"
				onclick={handleComplete}
				class={['success', blockers.length > 0 && 'cursor-not-allowed opacity-50']}
				disabled={blockers.length > 0}
			>
				{m.complete_setup()}
			</button>
		{:else}
			<div></div>
			<button disabled class="success cursor-not-allowed opacity-75">
				<svg class="mr-2 inline h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				Loading...
			</button>
		{/if}
	</div>
</div>
