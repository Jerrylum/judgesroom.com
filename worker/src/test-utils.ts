import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { awards, teams } from './db/schema';
import type { ServerContext } from './server-router';
import type { Award } from '@judging.jerryio/protocol/src/award';
import type { TeamData, TeamInfo } from '@judging.jerryio/protocol/src/team';
import path from 'path';

/**
 * Creates an in-memory SQLite database for testing
 * This mocks the DrizzleSqliteDODatabase functionality needed for tests
 */
export function createTestDatabase() {
	// Create an in-memory SQLite database
	const sqlite = new Database(':memory:');
	const db = drizzle(sqlite);

	// Apply Drizzle migrations to create the tables
	const migrationsFolder = path.join(__dirname, '../drizzle/migrations');
	migrate(db, { migrationsFolder });

	// Cast to match the expected DrizzleSqliteDODatabase interface
	// This works because both use the same drizzle-orm query API
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const testDb = db as any;

	return {
		db: testDb,
		sqlite,
		cleanup: () => sqlite.close()
	};
}

/**
 * Creates a test server context with a test database
 */
export function createTestServerContext(): ServerContext & { cleanup: () => void } {
	const { db, cleanup } = createTestDatabase();
	return {
		db,
		cleanup
	};
}

/**
 * Sample test data for awards
 */
export const sampleAwards: Award[] = [
	{
		name: 'Excellence Award',
		type: 'performance',
		acceptedGrades: ['High School', 'Middle School'],
		winnersCount: 1,
		requireNotebook: true
	},
	{
		name: 'Design Award',
		type: 'judged',
		acceptedGrades: ['High School'],
		winnersCount: 3,
		requireNotebook: true
	},
	{
		name: 'Teamwork Award',
		type: 'judged',
		acceptedGrades: ['Middle School', 'High School'],
		winnersCount: 2,
		requireNotebook: false
	},
	{
		name: 'Volunteer Award',
		type: 'volunteer_nominated',
		acceptedGrades: ['Elementary School', 'Middle School', 'High School'],
		winnersCount: 1,
		requireNotebook: false
	}
];

/**
 * Sample test data for team info
 */
export const sampleTeamInfoAndData: (TeamInfo & TeamData)[] = [
	{
		id: '550e8400-e29b-41d4-a716-446655440001',
		number: '123A',
		name: 'Robotics Team Alpha',
		city: 'San Francisco',
		state: 'CA',
		country: 'USA',
		shortName: 'Alpha',
		school: 'Tech High School',
		grade: 'High School',
		group: 'Group A',
		notebookLink: 'https://example.com/notebook',
		excluded: false
	},
	{
		id: '550e8400-e29b-41d4-a716-446655440002',
		number: '456B',
		name: 'Engineering Eagles',
		city: 'Austin',
		state: 'TX',
		country: 'USA',
		shortName: 'Eagles',
		school: 'Central Middle School',
		grade: 'Middle School',
		group: 'Group B',
		notebookLink: 'https://example.com/notebook',
		excluded: false
	},
	{
		id: '550e8400-e29b-41d4-a716-446655440003',
		number: '789C',
		name: 'Code Crushers',
		city: 'Seattle',
		state: 'WA',
		country: 'USA',
		shortName: 'Crushers',
		school: 'Innovation High',
		grade: 'High School',
		group: 'Group A',
		notebookLink: 'https://example.com/notebook',
		excluded: false
	},
	{
		id: '550e8400-e29b-41d4-a716-446655440004',
		number: '101D',
		name: 'Binary Builders',
		city: 'Portland',
		state: 'OR',
		country: 'USA',
		shortName: 'Builders',
		school: 'STEM Academy',
		grade: 'Middle School',
		group: 'Group C',
		notebookLink: 'https://example.com/notebook',
		excluded: false
	}
];

/**
 * Seeds the test database with sample data
 */
export async function seedTestDatabase(context: ServerContext) {
	// Insert sample awards
	// With { mode: 'json' }, Drizzle automatically handles JSON serialization
	await context.db.insert(awards).values(sampleAwards);

	// Insert sample team info
	await context.db.insert(teams).values(sampleTeamInfoAndData);
}
