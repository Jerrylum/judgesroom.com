import { z } from 'zod';
import { GradeSchema } from './award';

export const TeamNumberSchema = z
	.string()
	.nonempty()
	.max(10)
	.regex(/^[A-Z0-9]+$/, {
		message: 'Team number must only contain uppercase letters (A-Z) and digits (0-9)'
	});

export const TeamGroupNameSchema = z
	.string()
	.nonempty()
	.max(100)
	.regex(/^\S.*\S$|^\S$/, {
		message: 'Team group name must not have leading or trailing whitespace'
	});

export const TeamInfoSchema = z.object({
	id: z.uuidv4(),
	number: TeamNumberSchema,
	name: z.string().max(100),
	city: z.string().max(100),
	state: z.string().max(100),
	country: z.string().max(100),
	shortName: z.string().max(100),
	school: z.string().max(100),
	grade: GradeSchema,
	group: TeamGroupNameSchema
});

export type TeamInfo = z.infer<typeof TeamInfoSchema>;

export const NotebookDevelopmentStatusSchema = z.enum([
	'undetermined',
	'not_submitted',
	'developing',
	'fully_developed',
	'notebook_link_broken',
	'turned_in'
]);

export type NotebookDevelopmentStatus = z.infer<typeof NotebookDevelopmentStatusSchema>;

export const NotebookSubmissionMethodSchema = z.enum(['digital', 'physical']);

export type NotebookSubmissionMethod = z.infer<typeof NotebookSubmissionMethodSchema>;

export const TeamDataSchema = z.object({
	id: z.uuidv4(),
	notebookLink: z.string().max(200),
	hasInnovateAwardSubmissionForm: z.boolean(),
	notebookDevelopmentStatus: NotebookDevelopmentStatusSchema,
	absent: z.boolean()
});

export type TeamData = z.infer<typeof TeamDataSchema>;

export function isScoredNotebook(notebookDevelopmentStatus: NotebookDevelopmentStatus): boolean {
	return notebookDevelopmentStatus === 'fully_developed' || notebookDevelopmentStatus === 'developing';
}

export function trimNotebookLink(notebookLink: string): string {
	return notebookLink.trim();
}

/** Digital teams with no link start as Not Submitted. Physical teams start as Not Reviewed. */
export function initialNotebookDevelopmentStatus(method: NotebookSubmissionMethod, notebookLink: string): NotebookDevelopmentStatus {
	return method === 'digital' && trimNotebookLink(notebookLink) === '' ? 'not_submitted' : 'undetermined';
}

/**
 * Status stored when a notebook link is written.
 * Digital rules apply only when the trimmed link changes. A cleared link leaves
 * Developing and Fully Developed in place. Physical rooms keep the requested status.
 *
 * Existing rows are not rewritten on upgrade. A digital team that already has an
 * empty link and undetermined stays undetermined: sorting shows Not Reviewed,
 * Notebook Link Broken, and Start Rubric. Saving that same empty link does not
 * move it to Not Submitted.
 */
export function notebookDevelopmentStatusAfterLinkChange(input: {
	method: NotebookSubmissionMethod;
	previousLink: string;
	previousStatus: NotebookDevelopmentStatus;
	nextLink: string;
	requestedStatus: NotebookDevelopmentStatus;
}): NotebookDevelopmentStatus {
	const previousLink = trimNotebookLink(input.previousLink);
	const nextLink = trimNotebookLink(input.nextLink);
	if (input.method !== 'digital' || previousLink === nextLink) {
		return input.requestedStatus;
	}

	if (nextLink === '') {
		if (input.previousStatus === 'developing' || input.previousStatus === 'fully_developed') {
			return input.previousStatus;
		}
		return 'not_submitted';
	}

	if (previousLink === '' && input.previousStatus === 'not_submitted') {
		return 'undetermined';
	}

	if (input.previousStatus === 'notebook_link_broken') {
		return 'undetermined';
	}

	return input.requestedStatus === 'turned_in' ? 'undetermined' : input.requestedStatus;
}

/** Status stored when the room switches between digital and physical notebooks. */
export function notebookDevelopmentStatusAfterMethodChange(input: {
	previousMethod: NotebookSubmissionMethod;
	nextMethod: NotebookSubmissionMethod;
	notebookLink: string;
	status: NotebookDevelopmentStatus;
}): NotebookDevelopmentStatus {
	if (input.previousMethod === input.nextMethod) return input.status;

	if (input.nextMethod === 'physical') {
		return input.status === 'notebook_link_broken' ? 'undetermined' : input.status;
	}

	const notebookLink = trimNotebookLink(input.notebookLink);
	if (input.status === 'turned_in') return notebookLink === '' ? 'not_submitted' : 'undetermined';
	if (notebookLink === '' && input.status === 'undetermined') return 'not_submitted';
	if (notebookLink !== '' && input.status === 'not_submitted') return 'undetermined';
	return input.status;
}

/**
 * First save of a new room confirms the submission method after teams were drafted.
 * A joined room only reconciles when the method actually changes.
 */
export function notebookDevelopmentStatusForSetupSave(input: {
	isNewRoom: boolean;
	previousMethod: NotebookSubmissionMethod;
	nextMethod: NotebookSubmissionMethod;
	notebookLink: string;
	status: NotebookDevelopmentStatus;
}): NotebookDevelopmentStatus {
	if (input.isNewRoom) {
		if (input.status === 'developing' || input.status === 'fully_developed' || input.status === 'notebook_link_broken') {
			return input.status;
		}
		return initialNotebookDevelopmentStatus(input.nextMethod, input.notebookLink);
	}

	return notebookDevelopmentStatusAfterMethodChange(input);
}
