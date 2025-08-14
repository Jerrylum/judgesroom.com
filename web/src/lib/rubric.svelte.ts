import { z } from 'zod/v4';
import { TeamNumberSchema } from '@judging.jerryio/protocol/src/team';

export const EngineeringNotebookRubricSchema = z.object({
	id: z.uuidv4(),
	teamNumber: TeamNumberSchema,
	judgeId: z.uuidv4(),
	rubric: z.array(z.number().min(0).max(5)),
	notes: z.string(),
	innovateAwardNotes: z.string()
});

export type EngineeringNotebookRubric = z.infer<typeof EngineeringNotebookRubricSchema>;

export const TeamInterviewRubricSchema = z.object({
	id: z.uuidv4(),
	teamNumber: TeamNumberSchema,
	judgeId: z.uuidv4(),
	rubric: z.array(z.number())
});

export type TeamInterviewRubric = z.infer<typeof TeamInterviewRubricSchema>;

export const TeamInterviewNoteSchema = z.object({
	id: z.uuidv4(),
	teamNumber: TeamNumberSchema,
	judgeId: z.uuidv4(),
	rows: z.array(z.string())
});

export type TeamInterviewNote = z.infer<typeof TeamInterviewNoteSchema>;
