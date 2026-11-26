import { m } from '#lib/paraglide/messages.js';
import type { NotebookDevelopmentStatus, NotebookSubmissionMethod } from '@judgesroom.com/protocol/src/team';

export function notebookDevelopmentStatusLabel(status: NotebookDevelopmentStatus): string {
	switch (status) {
		case 'fully_developed':
			return m.fully_developed_notebook_status();
		case 'developing':
			return m.developing_notebook_status();
		case 'not_submitted':
			return m.not_submitted_notebook_status();
		case 'notebook_link_broken':
			return m.notebook_link_broken_status();
		case 'turned_in':
			return m.turned_in_notebook_status();
		case 'undetermined':
			return m.undetermined_notebook_status();
	}
}

export function notebookDevelopmentStatusClass(status: NotebookDevelopmentStatus): string {
	switch (status) {
		case 'fully_developed':
			return 'text-green-600';
		case 'developing':
			return 'text-yellow-600';
		case 'notebook_link_broken':
			return 'text-red-600';
		case 'turned_in':
			return 'text-blue-600';
		case 'not_submitted':
			return 'text-gray-500';
		case 'undetermined':
			return 'text-gray-400';
	}
}

/** One radio pair at a time. Start Rubric is hidden for Link Broken and Not Submitted. */
export function notebookSortingControls(
	method: NotebookSubmissionMethod,
	status: NotebookDevelopmentStatus
): { options: NotebookDevelopmentStatus[]; showStartRubric: boolean } {
	if (status === 'developing' || status === 'fully_developed') {
		return { options: ['developing', 'fully_developed'], showStartRubric: true };
	}
	if (method === 'physical') {
		return { options: ['not_submitted', 'turned_in'], showStartRubric: status === 'turned_in' };
	}
	if (status === 'not_submitted') {
		return { options: ['not_submitted'], showStartRubric: false };
	}
	return { options: ['undetermined', 'notebook_link_broken'], showStartRubric: status === 'undetermined' || status === 'turned_in' };
}

/** Submit sets these statuses to Developing, including a notebook another judge marked Link Broken. */
export function promotesToDevelopingOnSubmit(status: NotebookDevelopmentStatus): boolean {
	return status === 'undetermined' || status === 'not_submitted' || status === 'notebook_link_broken' || status === 'turned_in';
}
