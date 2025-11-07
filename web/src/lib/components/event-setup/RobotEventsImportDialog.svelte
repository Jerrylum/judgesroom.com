<script lang="ts">
	import { dialogs } from '$lib/index.svelte';
	import Dialog from '$lib/components/dialog/Dialog.svelte';

	export type ImportChoice = 'teams' | 'full' | null;

	interface Props {
		// No additional props needed for this dialog
	}

	let {}: Props = $props();

	function handleTeams() {
		dialogs.closeDialog('teams' as ImportChoice);
	}

	function handleFullSetup() {
		dialogs.closeDialog('full' as ImportChoice);
	}

	function handleCancel() {
		dialogs.closeDialog(null);
	}
</script>

<Dialog open={true} onClose={handleCancel} innerContainerClass="max-w-lg">
	<!-- Title -->
	<h3 id="dialog-title" class="mb-4 text-lg font-semibold text-gray-900">Import from RobotEvents</h3>

	<!-- Description -->
	<p id="dialog-message" class="mb-6 text-sm text-gray-600">
		How do you want to import from RobotEvents?
	</p>

	<!-- Choice Buttons -->
	<div class="space-y-4 mb-6">
		<!-- Import Teams -->
		<button 
			onclick={handleTeams}
			class="w-full text-left p-4 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
		>
			<div class="font-medium text-gray-900 mb-2">Import Teams</div>
			<div class="text-sm text-gray-600">
				Import team list only. Existing teams not in the import will be removed along with their judging data. Teams with matching numbers will preserve their existing data.
			</div>
		</button>

		<!-- Import Full Setup -->
		<button 
			onclick={handleFullSetup}
			class="w-full text-left p-4 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
		>
			<div class="font-medium text-gray-900 mb-2">Import Full Setup</div>
			<div class="text-sm text-gray-600">
				Import both teams and awards. The award list will be reset and you'll need to reconfigure custom awards. Awards with matching names will preserve their rankings.
			</div>
		</button>
	</div>

	<!-- Cancel Button -->
	<div class="flex justify-end">
		<button onclick={handleCancel} class="secondary">
			Cancel
		</button>
	</div>
</Dialog>
