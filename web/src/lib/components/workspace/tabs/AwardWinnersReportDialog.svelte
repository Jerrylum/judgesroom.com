<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { dialogs } from '$lib/index.svelte';
	import Dialog from '$lib/components/dialog/Dialog.svelte';
	import CloseIcon from '$lib/icon/CloseIcon.svelte';

	interface Props {
		generateReportText: (config: TeamPresentationConfig) => string;
	}

	export interface TeamPresentationConfig {
		showTeamNumber: boolean;
		showTeamName: boolean;
		showSchool: boolean;
		showCountry: boolean;
	}

	let { generateReportText }: Props = $props();
	let copyButtonText = $state(m.copy());
	let textareaElement: HTMLTextAreaElement;

	// Presentation configuration state
	let showTeamNumber = $state(true);
	let showTeamName = $state(false);
	let showSchool = $state(false);
	let showCountry = $state(false);

	// Derive the report text based on current configuration
	const reportText = $derived(
		generateReportText({
			showTeamNumber,
			showTeamName,
			showSchool,
			showCountry
		})
	);

	async function copyText() {
		try {
			await navigator.clipboard.writeText(reportText);
			copyButtonText = m.copied();
			setTimeout(() => {
				copyButtonText = m.copy();
			}, 2000);
		} catch (error) {
			console.error('Failed to copy text:', error);
			copyButtonText = m.failed();
			setTimeout(() => {
				copyButtonText = m.copy();
			}, 2000);
		}
	}

	function handleClose() {
		dialogs.closeDialog();
	}

	// Focus and select text when component mounts
	$effect(() => {
		if (textareaElement) {
			setTimeout(() => {
				textareaElement.focus();
				textareaElement.select();
			}, 0);
		}
	});
</script>

<Dialog open={true} onClose={handleClose} innerContainerClass="max-w-3xl">
	<div class="flex flex-col">
		<div class="mb-4 flex items-center justify-between">
			<h3 id="dialog-title" class="text-lg font-semibold text-gray-900">{m.award_winners_report()}</h3>
			<button onclick={handleClose} class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label={m.close_dialog()}>
				<CloseIcon size={24} />
			</button>
		</div>

		<p class="mb-4 text-sm text-gray-600">{m.copy_this_report_to_share_the_award_winners()}</p>

		<!-- Team Presentation Options -->
		<div class="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
			<h4 class="mb-3 text-sm font-semibold text-gray-700">{m.team_presentation()}</h4>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<label class="flex items-center space-x-2 text-sm">
					<input type="checkbox" bind:checked={showTeamNumber} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
					<span class="text-gray-700">{m.team_number_option()}</span>
				</label>
				<label class="flex items-center space-x-2 text-sm">
					<input type="checkbox" bind:checked={showTeamName} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
					<span class="text-gray-700">{m.team_name_option()}</span>
				</label>
				<label class="flex items-center space-x-2 text-sm">
					<input type="checkbox" bind:checked={showSchool} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
					<span class="text-gray-700">{m.school_option()}</span>
				</label>
				<label class="flex items-center space-x-2 text-sm">
					<input type="checkbox" bind:checked={showCountry} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
					<span class="text-gray-700">{m.country_option()}</span>
				</label>
			</div>
		</div>

		<div class="mb-4">
			<textarea
				bind:this={textareaElement}
				readonly
				value={reportText}
				class="classic block h-96 w-full font-mono text-sm"
				aria-label={m.award_winners_report()}
			></textarea>
		</div>

		<div class="flex justify-end space-x-3">
			<button onclick={handleClose} class="secondary">{m.close_dialog_text()}</button>
			<button onclick={copyText} class="primary">
				{copyButtonText}
			</button>
		</div>
	</div>
</Dialog>
