import { z } from 'zod';
import { TeamNumberSchema } from './team';

export const RankSchema = z.number().min(0).max(5);

export const EngineeringNotebookRubricSchema = z.object({
	id: z.uuidv4(),
	teamId: z.uuidv4(),
	judgeId: z.uuidv4(),
	rubric: z.array(RankSchema),
	notes: z.string(),
	innovateAwardNotes: z.string()
});

export type EngineeringNotebookRubric = z.infer<typeof EngineeringNotebookRubricSchema>;

export const TeamInterviewRubricSchema = z.object({
	id: z.uuidv4(),
	teamId: z.uuidv4(),
	judgeId: z.uuidv4(),
	rubric: z.array(RankSchema)
});

export type TeamInterviewRubric = z.infer<typeof TeamInterviewRubricSchema>;

export const TeamInterviewNoteSchema = z.object({
	id: z.uuidv4(),
	teamId: z.uuidv4(),
	judgeId: z.uuidv4(),
	rows: z.array(z.string())
});

export type TeamInterviewNote = z.infer<typeof TeamInterviewNoteSchema>;
