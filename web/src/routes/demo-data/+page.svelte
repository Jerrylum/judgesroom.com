<script lang="ts">
	import { app, dialogs } from '$lib/index.svelte';
	import { onMount } from 'svelte';
	import { v4 as uuidv4 } from 'uuid';
	import type { EssentialData } from '@judgesroom.com/protocol/src/event';
	import type { Judge } from '@judgesroom.com/protocol/src/judging';
	import type { TeamData } from '@judgesroom.com/protocol/src/team';
	import AlertDialog from '$lib/components/dialog/AlertDialog.svelte';
	import ConfirmationDialog from '$lib/components/dialog/ConfirmationDialog.svelte';
	import PromptDialog from '$lib/components/dialog/PromptDialog.svelte';
	import initialData from './initialData.json';
	import teamAttendance from './teamAttendance.json';
	import insertNotebookLinks from './insertNotebookLinks.json';
	import sortNotebookLinks from './sortNotebookLinks.json';
	import awardRanking from './awardRanking.json';
	import type { AwardRankingsPartialUpdate } from '@judgesroom.com/protocol/src/rubric';

	const currentDialog = $derived(dialogs.currentDialog);

	function generateRubricScores(len: number): number[] {
		return Array.from({ length: len }, () => Math.floor(Math.random() * 5) + 1);
	}

	onMount(async () => {
		// console.log('Test page mounted');

		const hasPermit = app.hasPermit();
		// confirm
		if (hasPermit) {
			const answer = await dialogs.showConfirmation({
				title: 'Test',
				message: 'Are you sure you want to inject test data?',
				confirmText: 'Yes',
				cancelText: 'No',
				confirmButtonClass: 'primary',
				cancelButtonClass: 'secondary'
			});

			if (!answer) {
				return;
			}
		}

		// inject test data
		app.handleEssentialDataUpdate(initialData.essentialData as EssentialData);
		app.handleAllTeamDataUpdate(initialData.teamData as TeamData[]);
		app.handleAllJudgesUpdate(initialData.judges as Judge[]);

		await app.createJudgesRoom();

		await app.selectUser({ role: 'judge_advisor' });

		// Create three judges for each judge group
		const judgeGroups = app.getAllJudgeGroups();
		const jg1id = judgeGroups[0].id;
		const jg2id = judgeGroups[1].id;

		const j1id = uuidv4();
		const j2id = uuidv4();
		const j3id = uuidv4();
		const j4id = uuidv4();
		const j5id = uuidv4();
		const j6id = uuidv4();

		const judges = [
			{ id: j1id, groupId: jg1id, groupIdx: 0 },
			{ id: j2id, groupId: jg1id, groupIdx: 0 },
			{ id: j3id, groupId: jg1id, groupIdx: 0 },
			{ id: j4id, groupId: jg2id, groupIdx: 1 },
			{ id: j5id, groupId: jg2id, groupIdx: 1 },
			{ id: j6id, groupId: jg2id, groupIdx: 1 }
		];

		await app.wrpcClient.judge.updateJudge.mutation({ id: j1id, name: 'Judge 1', groupId: jg1id });
		await app.wrpcClient.judge.updateJudge.mutation({ id: j2id, name: 'Judge 2', groupId: jg1id });
		await app.wrpcClient.judge.updateJudge.mutation({ id: j3id, name: 'Judge 3', groupId: jg1id });
		await app.wrpcClient.judge.updateJudge.mutation({ id: j4id, name: 'Judge 4', groupId: jg2id });
		await app.wrpcClient.judge.updateJudge.mutation({ id: j5id, name: 'Judge 5', groupId: jg2id });
		await app.wrpcClient.judge.updateJudge.mutation({ id: j6id, name: 'Judge 6', groupId: jg2id });

		await app.wrpcClient.team.updateAllTeamData.mutation(teamAttendance as TeamData[]);

		for (const data of insertNotebookLinks) {
			await app.wrpcClient.team.updateTeamData.mutation(data as TeamData);
		}

		for (const data of sortNotebookLinks) {
			await app.wrpcClient.team.updateTeamData.mutation(data as TeamData);
		}

		const teams = app.getAllTeamInfoAndData();

		for (const team of Object.values(teams)) {
			if (team.notebookDevelopmentStatus !== 'fully_developed') {
				continue;
			}
			for (const judge of judges) {
				if (judgeGroups[judge.groupIdx].assignedTeams.includes(team.id) === false) {
					continue;
				}
				await app.wrpcClient.judging.completeEngineeringNotebookRubric.mutation({
					judgeGroupId: judge.groupId,
					submission: {
						id: uuidv4(),
						teamId: team.id,
						judgeId: judge.id,
						rubric: generateRubricScores(11),
						notes: '',
						innovateAwardNotes: '',
						timestamp: Date.now()
					}
				});
			}
		}

		for (const team of Object.values(teams)) {
			if (team.absent) {
				continue;
			}
			for (const judge of judges) {
				if (judgeGroups[judge.groupIdx].assignedTeams.includes(team.id) === false) {
					continue;
				}
				await app.wrpcClient.judging.completeTeamInterviewRubric.mutation({
					judgeGroupId: judge.groupId,
					submission: {
						id: uuidv4(),
						teamId: team.id,
						judgeId: judge.id,
						rubric: generateRubricScores(9),
						notes: '',
						timestamp: Date.now()
					}
				});
			}
		}

		for (const data of awardRanking) {
			await app.wrpcClient.judging.updateAwardRanking.mutation(data as AwardRankingsPartialUpdate);
		}

		await app.wrpcClient.judging.startAwardDeliberation.mutation();

		

		dialogs.showAlert({
			title: 'Test',
			message: 'Test data injected successfully',
			confirmText: 'OK',
			confirmButtonClass: 'primary'
		});
	});
</script>

<div class="min-h-screen w-screen bg-slate-100">
	<h1>Test Page</h1>
</div>
<!-- Dialog System -->
{#if currentDialog}
	{#if currentDialog.type === 'alert'}
		<AlertDialog dialog={currentDialog} />
	{:else if currentDialog.type === 'confirmation'}
		<ConfirmationDialog dialog={currentDialog} />
	{:else if currentDialog.type === 'prompt'}
		<PromptDialog dialog={currentDialog} />
	{:else if currentDialog.type === 'custom'}
		{@const Component = currentDialog.component}

		<!-- <svelte:component this={currentDialog.component as any} {...currentDialog.props} /> -->
		<!-- https://svelte.dev/e/svelte_component_deprecated -->
		<Component {...currentDialog.props} />
	{/if}
{/if}
