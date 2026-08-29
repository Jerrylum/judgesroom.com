import {
	createEmptyInterview1_0Scores,
	createEmptyInterview2_0Payload,
	decodeInterviewRubric,
	sumRubricScores,
	type Interview2_0CriterionBody,
	type Interview2_0RubricPayload,
	type Interview2_0SectionKey,
	type InterviewRubricPayload,
	type TeamInterviewRubric
} from '@judgesroom.com/protocol/src/rubric';
import type { JudgeGuideVersion } from '@judgesroom.com/protocol/src/judge-guide';

export class TeamInterviewRubricDocument {
	readonly version: '1.0' | '2.0';
	notes = $state('');
	scores = $state<number[]>([]);
	payload = $state<Interview2_0RubricPayload | null>(null);
	#initialNotes = '';
	#initialScores: number[] = [];
	#initialPayloadJson = '';

	private constructor(version: '1.0' | '2.0', scores: number[], notes: string, payload: Interview2_0RubricPayload | null) {
		this.version = version;
		this.scores = scores;
		this.notes = notes;
		this.payload = payload;
		this.#initialNotes = notes;
		this.#initialScores = [...scores];
		this.#initialPayloadJson = payload ? JSON.stringify(payload) : '';
	}

	static createBlank(version: JudgeGuideVersion): TeamInterviewRubricDocument {
		if (version === '2.0') {
			return new TeamInterviewRubricDocument('2.0', [], '', createEmptyInterview2_0Payload());
		}
		return new TeamInterviewRubricDocument('1.0', createEmptyInterview1_0Scores(), '', null);
	}

	static tryLoad(row: TeamInterviewRubric): TeamInterviewRubricDocument | null {
		const decoded = decodeInterviewRubric(row.rubric);
		if (!decoded) return null;
		if (decoded.version === '2.0') {
			const additionalNotes = decoded.payload.additionalNotes || row.notes;
			decoded.payload.additionalNotes = additionalNotes;
			return new TeamInterviewRubricDocument('2.0', decoded.scores, additionalNotes, structuredClone(decoded.payload));
		}
		return new TeamInterviewRubricDocument('1.0', decoded.scores, row.notes, null);
	}

	criterion(sectionKey: Interview2_0SectionKey, criterionKey: string): Interview2_0CriterionBody {
		const section = this.payload?.[sectionKey] as Record<string, Interview2_0CriterionBody> | undefined;
		if (!section?.[criterionKey]) {
			throw new Error(`Missing interview 2.0 criterion ${sectionKey}.${criterionKey}`);
		}
		return section[criterionKey];
	}

	isComplete(): boolean {
		if (this.version === '2.0') {
			if (!this.payload) return false;
			return this.criterionPoints().every((points) => points !== -1);
		}
		return this.scores.every((score) => score !== -1);
	}

	isDirty(): boolean {
		if (this.version === '2.0') {
			return JSON.stringify(this.payload) !== this.#initialPayloadJson;
		}
		return this.notes !== this.#initialNotes || this.scores.some((score, index) => score !== this.#initialScores[index]);
	}

	markSaved(): void {
		this.#initialNotes = this.notes;
		this.#initialScores = [...this.scores];
		this.#initialPayloadJson = this.payload ? JSON.stringify(this.payload) : '';
	}

	toPayload(): InterviewRubricPayload {
		if (this.version === '2.0') {
			if (!this.payload) {
				throw new Error('Interview 2.0 document is missing a payload');
			}
			return this.payload;
		}
		return this.scores;
	}

	rowNotes(): string {
		if (this.version === '2.0') {
			return this.payload?.additionalNotes ?? '';
		}
		return this.notes;
	}

	totalScore(): number | null {
		if (!this.isComplete()) return null;
		if (this.version === '2.0') {
			return sumRubricScores(this.criterionPoints());
		}
		return sumRubricScores(this.scores);
	}

	private criterionPoints(): number[] {
		if (!this.payload) return [];
		return [
			this.payload.explainYourLearning.studentsExplainTheirOwnWork.points,
			this.payload.explainYourLearning.studentsTraceHowTheyGotThere.points,
			this.payload.explainYourLearning.studentsShowHowTheyKnowItWorks.points,
			this.payload.howYouWorkedWithOthers.studentsLearnedFromAndWithEachOther.points,
			this.payload.howYouWorkedWithOthers.decisionsWereMadeTogether.points,
			this.payload.howYouWorkedWithOthers.outsideIdeasWereMadeTheirOwn.points
		];
	}
}
