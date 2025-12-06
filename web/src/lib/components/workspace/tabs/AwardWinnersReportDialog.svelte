<script lang="ts">
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
	let copyButtonText = $state('Copy');
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
			copyButtonText = 'Copied!';
			setTimeout(() => {
				copyButtonText = 'Copy';
			}, 2000);
		} catch (error) {
			console.error('Failed to copy text:', error);
			copyButtonText = 'Failed';
			setTimeout(() => {
				copyButtonText = 'Copy';
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
			<h3 id="dialog-title" class="text-lg font-semibold text-gray-900">Award Winners Report</h3>
			<button onclick={handleClose} class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close dialog">
				<CloseIcon size={24} />
			</button>
		</div>

		<p class="mb-4 text-sm text-gray-600">Copy this report to share the award winners.</p>

		<!-- Team Presentation Options -->
		<div class="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
			<h4 class="mb-3 text-sm font-semibold text-gray-700">Team Presentation</h4>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<label class="flex items-center space-x-2 text-sm">
					<input type="checkbox" bind:checked={showTeamNumber} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
					<span class="text-gray-700">Team Number</span>
				</label>
				<label class="flex items-center space-x-2 text-sm">
					<input type="checkbox" bind:checked={showTeamName} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
					<span class="text-gray-700">Team Name</span>
				</label>
				<label class="flex items-center space-x-2 text-sm">
					<input type="checkbox" bind:checked={showSchool} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
					<span class="text-gray-700">School</span>
				</label>
				<label class="flex items-center space-x-2 text-sm">
					<input type="checkbox" bind:checked={showCountry} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
					<span class="text-gray-700">Country</span>
				</label>
			</div>
		</div>

		<div class="mb-4">
			<textarea
				bind:this={textareaElement}
				readonly
				value={reportText}
				class="classic block h-96 w-full font-mono text-sm"
				aria-label="Award winners report"
			></textarea>
		</div>

		<div class="flex justify-end space-x-3">
			<button onclick={handleClose} class="secondary">Close</button>
			<button onclick={copyText} class="primary">
				{copyButtonText}
			</button>
		</div>
	</div>
</Dialog>
