import { describe, it, expect } from 'vitest';
import { EventGradeLevelSchema, EventNameSchema } from './event';

describe('Event Schema Validation', () => {
	describe('EventGradeLevelSchema', () => {
		it('should validate valid event grade levels', () => {
			const validGradeLevels = ['ES Only', 'MS Only', 'HS Only', 'Blended', 'College Only'];
			validGradeLevels.forEach((gradeLevel) => {
				expect(() => EventGradeLevelSchema.parse(gradeLevel)).not.toThrow();
			});
		});

		it('should reject invalid event grade levels', () => {
			const invalidGradeLevels = [
				'',
				'Elementary Only',
				'Middle Only',
				'High Only',
				'es only',
				'ES_Only',
				'Mixed',
				'All Grades',
				'Elementary School',
				'Middle School',
				'High School',
				'College'
			];
			invalidGradeLevels.forEach((gradeLevel) => {
				expect(() => EventGradeLevelSchema.parse(gradeLevel)).toThrow();
			});
		});
	});

	describe('EventNameSchema', () => {
		it('should validate valid event names', () => {
			const validNames = [
				'My Event',
				'VEX Robotics Competition',
				'A',
				'State Championship 2024',
				'Regional Tournament - Winter',
				'Event #123',
				'Competition_Name',
				'Event.Name',
				'Event/Name',
				'Event-Name',
				'Event Name with Many Words and Numbers 123'
			];
			validNames.forEach((name) => {
				expect(() => EventNameSchema.parse(name)).not.toThrow();
			});
		});

		it('should reject invalid event names', () => {
			const invalidNames = [
				'', // empty
				' My Event', // leading space
				'My Event ', // trailing space
				' My Event ', // leading and trailing spaces
				'A'.repeat(101), // too long (>100 chars)
				'\tEvent', // leading tab
				'Event\n', // trailing newline
				'  ', // only spaces
				'\t\n', // only whitespace
				'Event\t', // trailing tab
				'\nEvent' // leading newline
			];
			invalidNames.forEach((name) => {
				expect(() => EventNameSchema.parse(name)).toThrow();
			});
		});
	});
});
