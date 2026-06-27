<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { formatGradesShort, type Award } from '@judgesroom.com/protocol/src/award';
	import type { TeamInfoAndData } from '$lib/team.svelte';
	import Dialog from '$lib/components/dialog/Dialog.svelte';
	import { subscriptions } from '$lib/index.svelte';
	import { meetsAwardNotebookRequirement, requiresFullyDevelopedNotebook } from '$lib/award.svelte';

	interface Props {
		open: boolean;
		award: Award;
		allTeams: Readonly<Record<string, Readonly<TeamInfoAndData>>>;
		absentTeamIds: Set<string>;
		onClose: () => void;
		onConfirm: (teamId: string, showAbsent: boolean, bypassRequirements: boolean) => void;
	}

	type AwardRequirementChecks = {
		meetNotebook: boolean;
		meetTeamInterview: boolean;
		meetGrade: boolean;
	};

	let { open, award, allTeams, absentTeamIds, onClose, onConfirm }: Props = $props();

	const teamsWithTeamInterview = $derived.by(() => {
		const teamIds = new Set<string>();
		for (const cache of Object.values(subscriptions.allSubmissionCaches)) {
			if (cache.tiId) {
				teamIds.add(cache.teamId);
			}
		}
		return teamIds;
	});

	function getAwardRequirementChecks(teamId: string, team: TeamInfoAndData): AwardRequirementChecks {
		return {
			meetNotebook: meetsAwardNotebookRequirement(award, team.notebookDevelopmentStatus),
			meetTeamInterview: !award.requireTeamInterview || teamsWithTeamInterview.has(teamId),
			meetGrade: award.acceptedGrades.includes(team.grade)
		};
	}

	function meetsAllAwardRequirements(teamId: string, team: TeamInfoAndData): boolean {
		const checks = getAwardRequirementChecks(teamId, team);
		return checks.meetNotebook && checks.meetTeamInterview && checks.meetGrade;
	}

	function getRequirementWarnings(teamId: string, team: TeamInfoAndData): string[] {
		const checks = getAwardRequirementChecks(teamId, team);
		const warnings: string[] = [];

		if (!checks.meetNotebook) {
			if (requiresFullyDevelopedNotebook(award.name)) {
				warnings.push(m.fully_developed_required_btn());
			} else {
				warnings.push(m.notebook_required());
			}
		}
		if (!checks.meetTeamInterview) {
			warnings.push(m.team_interview_required_btn());
		}
		if (!checks.meetGrade) {
			warnings.push(m.grade_must_be({ grades: formatGradesShort(award.acceptedGrades) }));
		}

		return warnings;
	}

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

	const availableTeamsList = $derived.by(() => {
		return Object.entries(allTeams).filter(([teamId, team]) => {
			if (absentTeamIds.has(teamId)) {
				return false;
			}

			if (team.absent && !showAbsentTeams) {
				return false;
			}

			if (!bypassRequirements && !meetsAllAwardRequirements(teamId, team)) {
				return false;
			}

			return true;
		});
	});

	const selectedTeam = $derived(selectedTeamId ? allTeams[selectedTeamId] : null);

	const requirementWarningsList = $derived.by(() => {
		if (!selectedTeam || bypassRequirements || meetsAllAwardRequirements(selectedTeamId, selectedTeam)) {
			return [];
		}

		return getRequirementWarnings(selectedTeamId, selectedTeam);
	});

	function handleClose() {
		onClose();
	}

	function handleConfirm() {
		if (selectedTeamId) {
			onConfirm(selectedTeamId, showAbsentTeams, bypassRequirements);
		}
	}

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
