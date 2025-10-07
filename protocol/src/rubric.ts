import { z } from 'zod';
import { AwardNameSchema } from './award';

export const SubmissionSchema = z.object({
	id: z.uuidv4(),
	judgeId: z.uuidv4()
});

export type Submission = z.infer<typeof SubmissionSchema>;

export const SubmissionCacheSchema = z.object({
	judgeGroupId: z.uuidv4(),
	teamId: z.uuidv4(),
	judgeId: z.uuidv4(),
	enrId: z.uuidv4().nullable(),
	tiId: z.uuidv4().nullable(),
	tnId: z.uuidv4().nullable()
});

export type SubmissionCache = z.infer<typeof SubmissionCacheSchema>;

export const RankSchema = z.number().min(0).max(5);

export const EngineeringNotebookRubricSchema = z.object({
	id: z.uuidv4(),
	teamId: z.uuidv4(),
	judgeId: z.uuidv4(),
	rubric: z.array(RankSchema),
	notes: z.string(),
	innovateAwardNotes: z.string(),
	timestamp: z.number()
});

export type EngineeringNotebookRubric = z.infer<typeof EngineeringNotebookRubricSchema>;

export const TeamInterviewRubricSchema = z.object({
	id: z.uuidv4(),
	teamId: z.uuidv4(),
	judgeId: z.uuidv4(),
	rubric: z.array(RankSchema),
	notes: z.string(),
	timestamp: z.number()
});

export type TeamInterviewRubric = z.infer<typeof TeamInterviewRubricSchema>;

export const TeamInterviewNoteSchema = z.object({
	id: z.uuidv4(),
	teamId: z.uuidv4(),
	judgeId: z.uuidv4(),
	rows: z.array(z.string()),
	timestamp: z.number()
});

export type TeamInterviewNote = z.infer<typeof TeamInterviewNoteSchema>;

export const AwardRankingsFullUpdateSchema = z.object({
	judgeGroupId: z.uuidv4(),
	judgedAwards: z.array(AwardNameSchema),
	// team id: [award 1 rank, award 2 rank, ...]
	rankings: z.record(z.uuidv4(), z.array(RankSchema))
});

export type AwardRankingsFullUpdate = z.infer<typeof AwardRankingsFullUpdateSchema>;

export const AwardRankingsPartialUpdateSchema = z.object({
	judgeGroupId: z.uuidv4(),
	teamId: z.uuidv4(),
	awardName: AwardNameSchema,
	ranking: RankSchema
});

export type AwardRankingsPartialUpdate = z.infer<typeof AwardRankingsPartialUpdateSchema>;

export const AwardNominationSchema = z.object({
	teamId: z.uuidv4(),
	judgeGroupId: z.uuidv4().nullable()
});

export type AwardNomination = z.infer<typeof AwardNominationSchema>;
