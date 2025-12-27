<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { Award } from '@judgesroom.com/protocol/src/award';
	import type { TeamInfoAndData } from '$lib/team.svelte';
	import Dialog from '$lib/components/dialog/Dialog.svelte';
	import { isSubmittedNotebook } from '@judgesroom.com/protocol/src/team';

	interface Props {
		open: boolean;
		award: Award;
		allTeams: Readonly<Record<string, Readonly<TeamInfoAndData>>>;
		absentTeamIds: Set<string>;
		onClose: () => void;
		onConfirm: (teamId: string, showAbsent: boolean, bypassRequirements: boolean) => void;
	}

	let { open, award, allTeams, absentTeamIds, onClose, onConfirm }: Props = $props();

	// Dialog state
	let selectedTeamId = $state('');
	let showAbsentTeams = $state(false);
	let bypassRequirements = $state(false);

	// Reset form when dialog opens
	$effect(() => {
		if (open) {
			selectedTeamId = '';
			showAbsentTeams = false;
			bypassRequirements = false;
		}
	});

	// Get available teams based on filters
	let availableTeams = $derived(() => {
		const teams = Object.entries(allTeams);

		return teams.filter(([teamId, team]) => {
			// Always hide already nominated teams
			if (absentTeamIds.has(teamId)) {
				return false;
			}

			// Hide absent teams unless "Show absent teams" is checked
			if (team.absent && !showAbsentTeams) {
				return false;
			}

			// Hide teams that don't meet award requirements unless bypassing
			if (!bypassRequirements) {
				const meetNotebookReq = award.requireNotebook ? isSubmittedNotebook(team.notebookDevelopmentStatus) : true;
				const meetGradeReq = award.acceptedGrades.includes(team.grade);
				const meetInnovateAwardSubmissionFormReq = award.name !== 'Innovate Award' || team.hasInnovateAwardSubmissionForm;

				if (!meetNotebookReq || !meetGradeReq || !meetInnovateAwardSubmissionFormReq) {
					return false;
				}
			}

			return true;
		});
	});

	// Get the actual list for template iteration
	let availableTeamsList = $derived(availableTeams());

	// Check if selected team meets award requirements
	let selectedTeam = $derived(selectedTeamId ? allTeams[selectedTeamId] : null);
	let meetRequirements = $derived(() => {
		if (!selectedTeam || bypassRequirements) return true;

		const meetNotebookReq = award.requireNotebook ? isSubmittedNotebook(selectedTeam.notebookDevelopmentStatus) : true;
		const meetGradeReq = award.acceptedGrades.includes(selectedTeam.grade);

		return meetNotebookReq && meetGradeReq;
	});

	// Get the actual meet requirements value for template use
	let meetRequirementsValue = $derived(meetRequirements());

	let requirementWarnings = $derived(() => {
		if (!selectedTeam || bypassRequirements || meetRequirementsValue) return [];

		const warnings = [];
		if (award.requireNotebook && !isSubmittedNotebook(selectedTeam.notebookDevelopmentStatus)) {
			warnings.push(m.notebook_required());
		}
		if (!award.acceptedGrades.includes(selectedTeam.grade)) {
			warnings.push(m.grade_must_be({ grades: award.acceptedGrades.join(', ') }));
		}
		return warnings;
	});

	// Get the actual list for template iteration
	let requirementWarningsList = $derived(requirementWarnings());

	function handleClose() {
		onClose();
	}

	function handleConfirm() {
		if (selectedTeamId) {
			onConfirm(selectedTeamId, showAbsentTeams, bypassRequirements);
		}
	}

	// Format team display with number and name
	function formatTeamDisplay(team: TeamInfoAndData): string {
		return `${team.number} - ${team.name}`;
	}
</script>

<Dialog {open} onClose={handleClose} innerContainerClass="max-w-md">
	<h3 class="mb-4 text-lg font-semibold text-gray-900">{m.add_nomination_to({ awardName: award.name })}</h3>

	<!-- Team Selection -->
	<div class="mb-4">
		<label for="team-select" class="mb-2 block text-sm font-medium text-gray-700">{m.select_team()}</label>
		<select id="team-select" bind:value={selectedTeamId} class="classic block w-full">
			<option value="">{m.select_a_team()}</option>
			{#each availableTeamsList as [teamId, team]}
				<option value={teamId}>{formatTeamDisplay(team)}</option>
			{/each}
		</select>
	</div>

	<!-- Award Requirement Warnings -->
	{#if requirementWarningsList.length > 0}
		<div class="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-3">
			<div class="flex">
				<div class="shrink-0">
					<svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-yellow-800">{m.award_requirements_not_met()}</h3>
					<div class="mt-2 text-sm text-yellow-700">
						<ul class="list-disc space-y-1 pl-5">
							{#each requirementWarningsList as warning}
								<li>{warning}</li>
							{/each}
						</ul>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Checkboxes -->
	<div class="mb-6 space-y-3">
		<label class="flex items-center">
			<input type="checkbox" bind:checked={showAbsentTeams} class="mr-2" />
			<span class="text-sm text-gray-700">{m.show_absent_teams()}</span>
		</label>

		<label class="flex items-center">
			<input type="checkbox" bind:checked={bypassRequirements} class="mr-2" />
			<span class="text-sm text-gray-700">{m.bypass_award_requirement_checks()}</span>
		</label>
	</div>

	<!-- Buttons -->
	<div class="flex justify-end space-x-3">
		<button onclick={handleClose} class="secondary">{m.cancel()}</button>
		<button onclick={handleConfirm} class="primary" disabled={!selectedTeamId}>{m.add_nomination()}</button>
	</div>
</Dialog>
