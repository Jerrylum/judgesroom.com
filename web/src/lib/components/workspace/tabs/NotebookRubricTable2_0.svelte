<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { sanitizeHTMLMessage } from '$lib/i18n';
	import { notebook2_0RubricSections } from '@judgesroom.com/protocol/src/notebook-2.0';
	import type { NotebookRubricDocument } from '$lib/notebook-rubric-document.svelte';
	import NotebookRubricTableView from './NotebookRubricTableView.svelte';

	interface Props {
		document: NotebookRubricDocument;
		isSubmitted: boolean;
		showValidationErrors: boolean;
	}

	let { document, isSubmitted, showValidationErrors }: Props = $props();
</script>

<p class="mb-2 text-sm text-gray-600">
	{@html sanitizeHTMLMessage(m.notebook_rubric_2_0_directions)}
</p>
<p class="mb-6 text-sm text-gray-600">
	{@html sanitizeHTMLMessage(m.notebook_rubric_notes)}
</p>

<NotebookRubricTableView {document} sections={notebook2_0RubricSections} {isSubmitted} {showValidationErrors} />
