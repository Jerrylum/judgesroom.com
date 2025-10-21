import z from 'zod/v4';
import { JudgeSchema } from '@judgesroom.com/protocol/src/judging';

export const RoleSchema = z.enum(['judge', 'judge_advisor']);
export type Role = z.infer<typeof RoleSchema>;

export const JudgeUserSchema = z.object({
	role: z.literal('judge'),
	judge: JudgeSchema
});
export type JudgeUser = z.infer<typeof JudgeUserSchema>;

export const JudgeAdvisorUserSchema = z.object({
	role: z.literal('judge_advisor')
});
export type JudgeAdvisorUser = z.infer<typeof JudgeAdvisorUserSchema>;

export const UserSchema = z.discriminatedUnion('role', [JudgeUserSchema, JudgeAdvisorUserSchema]);
export type User = z.infer<typeof UserSchema>;
