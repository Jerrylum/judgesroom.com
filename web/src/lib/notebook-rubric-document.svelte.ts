import {
	createEmptyNotebookScores,
	decodeNotebookRubric,
	encodeNotebookRubric,
	sumRubricScores,
	type EngineeringNotebookRubric,
	type NotebookRubricPayload
} from '@judgesroom.com/protocol/src/rubric';
import type { JudgeGuideVersion } from '@judgesroom.com/protocol/src/judge-guide';

export class NotebookRubricDocument {
	readonly version: '1.0' | '2.0';
	notes = $state('');
	scores = $state<number[]>([]);
	#initialNotes = '';
	#initialScores: number[] = [];

	private constructor(version: '1.0' | '2.0', scores: number[], notes: string) {
		this.version = version;
		this.scores = scores;
		this.notes = notes;
		this.#initialNotes = notes;
		this.#initialScores = [...scores];
	}

	static createBlank(version: JudgeGuideVersion): NotebookRubricDocument {
		const rubricVersion = version === '2.0' ? '2.0' : '1.0';
		return new NotebookRubricDocument(rubricVersion, createEmptyNotebookScores(rubricVersion), '');
	}

	static tryLoad(row: EngineeringNotebookRubric): NotebookRubricDocument | null {
		const decoded = decodeNotebookRubric(row.rubric);
		if (!decoded) return null;
		return new NotebookRubricDocument(decoded.version, decoded.scores, row.notes);
	}

	isComplete(): boolean {
		return this.scores.every((score) => score !== -1);
	}

	isDirty(): boolean {
		return this.notes !== this.#initialNotes || this.scores.some((score, index) => score !== this.#initialScores[index]);
	}

	markSaved(): void {
		this.#initialNotes = this.notes;
		this.#initialScores = [...this.scores];
	}

	toPayload(): NotebookRubricPayload {
		return encodeNotebookRubric(this.version, this.scores);
	}

	totalScore(): number | null {
		if (!this.isComplete()) return null;
		return sumRubricScores(this.scores);
	}
}
