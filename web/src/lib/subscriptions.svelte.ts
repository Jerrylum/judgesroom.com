import type { AwardRankingsFullUpdate, SubmissionCache } from '@judgesroom.com/protocol/src/rubric';
import type { TeamPhoto } from '@judgesroom.com/protocol/src/media';

export interface SubscriptionsStorage {
	allJudgeGroupsAwardRankings: Record<string, AwardRankingsFullUpdate>; // key is judge group id
	allJudgeGroupsReviewedTeams: Record<string, string[]>; // key is judge group id
	allSubmissionCaches: Record<string, SubmissionCache>; // key is submission id (rubric id or team interview id or team interview note id)
	allTeamPhotos: Record<string, TeamPhoto>; // key is photo id
}
