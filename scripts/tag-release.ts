/**
 * Create and push v{App.version} after check + test.
 *
 *   bun run tag-release
 *
 * Does not bump App.version. Set that in web/src/lib/app.svelte.ts first.
 * Use 2.2.0 for production (judgesroom.com) or 2.2.0-beta.1 for a GitHub
 * pre-release deployed to beta.judgesroom.com.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP_FILE = join(ROOT, 'web', 'src', 'lib', 'app.svelte.ts');
const VERSION_RE = /public readonly version:\s*string\s*=\s*'(\d+\.\d+\.\d+(?:-beta\.\d+)?)'/;

function run(command: string, args: string[], options: { allowFail?: boolean } = {}) {
	const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit', encoding: 'utf8' });
	if (!options.allowFail && result.status !== 0) {
		throw new Error(`${command} ${args.join(' ')} failed with exit ${result.status ?? 'null'}`);
	}
	return result;
}

function capture(command: string, args: string[]): string {
	const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8' });
	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(' ')} failed: ${(result.stderr || result.stdout).trim()}`);
	}
	return (result.stdout || '').trim();
}

function readAppVersion(): string {
	const text = readFileSync(APP_FILE, 'utf8');
	const match = text.match(VERSION_RE);
	if (!match) {
		throw new Error(`Could not read App.version from ${APP_FILE}`);
	}
	return match[1];
}

function assertCleanWorktree() {
	const dirty = capture('git', ['status', '--porcelain']);
	if (dirty) {
		throw new Error('Working tree has uncommitted changes. Commit or stash them first.');
	}
}

function assertTagAvailable(tag: string) {
	const local = spawnSync('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`], {
		cwd: ROOT,
		encoding: 'utf8'
	});
	if (local.status === 0) {
		throw new Error(`Tag ${tag} already exists locally.`);
	}

	const remote = spawnSync('git', ['ls-remote', '--exit-code', '--tags', 'origin', `refs/tags/${tag}`], {
		cwd: ROOT,
		encoding: 'utf8'
	});
	if (remote.status === 0) {
		throw new Error(`Tag ${tag} already exists on origin.`);
	}
	if (remote.status !== 2) {
		throw new Error(`Could not check origin for ${tag} (exit ${remote.status ?? 'null'}).`);
	}
}

function assertHeadPushed() {
	const upstream = spawnSync('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], {
		cwd: ROOT,
		encoding: 'utf8'
	});
	if (upstream.status !== 0) {
		throw new Error('Current branch has no upstream. Push the branch and set upstream first.');
	}
	const remoteBranch = upstream.stdout.trim();
	const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', 'HEAD', remoteBranch], { cwd: ROOT });
	if (ancestor.status !== 0) {
		throw new Error(`HEAD is not on ${remoteBranch}. Push the branch first, then re-run.`);
	}
}

function main() {
	const version = readAppVersion();
	const tag = `v${version}`;
	const channel = /-beta\.\d+$/.test(version) ? 'beta.judgesroom.com (GitHub pre-release)' : 'judgesroom.com';
	console.log(`Releasing ${tag} → ${channel}`);

	assertCleanWorktree();
	run('git', ['fetch', 'origin']);
	assertHeadPushed();
	assertTagAvailable(tag);

	console.log('Running type checks…');
	run('bun', ['run', 'check']);
	console.log('Running tests…');
	run('bun', ['run', 'test']);

	assertCleanWorktree();
	run('git', ['tag', tag]);
	run('git', ['push', 'origin', tag]);
	console.log(`Pushed ${tag}. Deploy (${channel}) and standalone workflows should start on GitHub.`);
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
