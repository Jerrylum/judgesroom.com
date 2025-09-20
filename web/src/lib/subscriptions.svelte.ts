import type { AwardRankingsFullUpdate } from '@judging.jerryio/protocol/src/rubric';

export interface SubscriptionsStorage {
	allJudgeGroupsAwardRankings: Record<string, AwardRankingsFullUpdate>;
	allJudgeGroupsReviewedTeams: Record<string, string[]>;
}
