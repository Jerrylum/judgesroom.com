/**
 * Build a Judges Room Standalone zip for a Judge Advisor laptop.
 * Run on a build machine that has Bun and Node (npm). The JA does not install either.
 *
 *   bun run pack:standalone -- --target windows-x64
 *   bun run pack:standalone -- --target macos-arm64
 *   bun run pack:standalone -- --target windows-x64 --skip-web-build
 *   bun run pack:standalone -- --target macos-arm64 --skip-web-build --skip-worker-build
 */
import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP_FILE = join(ROOT, 'web', 'src', 'lib', 'app.svelte.ts');
const VERSION_RE = /public readonly version:\s*string\s*=\s*'(\d+\.\d+\.\d+)'/;
const CACHE_DIR = join(ROOT, '.pack-cache');
const DIST_DIR = join(ROOT, 'dist');
const TEMPLATES_DIR = join(ROOT, 'scripts', 'judgesroom-standalone');
const WORKER_PACKAGE = JSON.parse(readFileSync(join(ROOT, 'worker', 'package.json'), 'utf8')) as {
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
};
const WRANGLER_VERSION = WORKER_PACKAGE.devDependencies.wrangler.replace(/^\^/, '');
const NODE_VERSION = '22.23.2';

type TargetId = 'windows-x64' | 'macos-arm64';

type Target = {
	id: TargetId;
	npmOs: 'win32' | 'darwin';
	npmCpu: 'x64' | 'arm64';
	nodeArchiveKind: 'zip' | 'tar.gz';
	nodeDirName: (version: string) => string;
	nodeBinInArchive: string;
	nodeBinInRuntime: string;
	workerdPackage: string;
	launcherFile: string;
};

const TARGETS: Record<TargetId, Target> = {
	'windows-x64': {
		id: 'windows-x64',
		npmOs: 'win32',
		npmCpu: 'x64',
		nodeArchiveKind: 'zip',
		nodeDirName: (version) => `node-v${version}-win-x64`,
		nodeBinInArchive: 'node.exe',
		nodeBinInRuntime: join('runtime', 'node.exe'),
		workerdPackage: '@cloudflare/workerd-windows-64',
		launcherFile: 'Start.bat'
	},
	'macos-arm64': {
		id: 'macos-arm64',
		npmOs: 'darwin',
		npmCpu: 'arm64',
		nodeArchiveKind: 'tar.gz',
		nodeDirName: (version) => `node-v${version}-darwin-arm64`,
		nodeBinInArchive: join('bin', 'node'),
		nodeBinInRuntime: join('runtime', 'bin', 'node'),
		workerdPackage: '@cloudflare/workerd-darwin-arm64',
		launcherFile: 'Start.command'
	}
};

function parseArgs(argv: string[]) {
	let target: TargetId | undefined;
	let skipWebBuild = false;
	let skipWorkerBuild = false;
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--target') {
			target = argv[++i] as TargetId;
		} else if (arg.startsWith('--target=')) {
			target = arg.slice('--target='.length) as TargetId;
		} else if (arg === '--skip-web-build') {
			skipWebBuild = true;
		} else if (arg === '--skip-worker-build') {
			skipWorkerBuild = true;
		} else if (arg === '--help' || arg === '-h') {
			console.log(
				'Usage: bun run pack:standalone -- --target windows-x64|macos-arm64 [--skip-web-build] [--skip-worker-build]'
			);
			process.exit(0);
		}
	}
	if (!target || !(target in TARGETS)) {
		throw new Error('Pass --target windows-x64 or --target macos-arm64');
	}
	return { target: TARGETS[target], skipWebBuild, skipWorkerBuild };
}

function run(command: string, args: string[], cwd: string) {
	const result = spawnSync(command, args, { cwd, stdio: 'inherit', encoding: 'utf8' });
	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(' ')} failed with exit ${result.status ?? 'null'}`);
	}
}

async function download(url: string, dest: string) {
	if (existsSync(dest)) {
		return;
	}
	mkdirSync(dirname(dest), { recursive: true });
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Download failed ${response.status}: ${url}`);
	}
	const tmp = `${dest}.partial`;
	writeFileSync(tmp, Buffer.from(await response.arrayBuffer()));
	cpSync(tmp, dest);
	rmSync(tmp);
}

function extractArchive(archive: string, dest: string, kind: 'zip' | 'tar.gz') {
	rmSync(dest, { recursive: true, force: true });
	mkdirSync(dest, { recursive: true });
	if (kind === 'zip') {
		run('unzip', ['-q', archive, '-d', dest], ROOT);
	} else {
		run('tar', ['-xzf', archive, '-C', dest], ROOT);
	}
}

function buildWorkerBundle(outDir: string) {
	rmSync(outDir, { recursive: true, force: true });
	mkdirSync(outDir, { recursive: true });
	run(
		'bunx',
		['wrangler', 'deploy', '--dry-run', '--outdir', outDir, '--env', 'production'],
		join(ROOT, 'worker')
	);
	if (!existsSync(join(outDir, 'index.js'))) {
		throw new Error(`Worker bundle missing index.js in ${outDir}`);
	}
}

function copyWorkerBundle(bundleDir: string, destWorker: string) {
	mkdirSync(destWorker, { recursive: true });
	for (const name of ['index.js']) {
		const source = join(bundleDir, name);
		if (!existsSync(source)) {
			throw new Error(`Worker bundle missing ${name}`);
		}
		cpSync(source, join(destWorker, name));
	}
	for (const name of readdirSync(bundleDir)) {
		if (name.endsWith('.sql')) {
			cpSync(join(bundleDir, name), join(destWorker, name));
		}
	}
}

function writePackagedWranglerConfig(dest: string) {
	let text = readFileSync(join(ROOT, 'worker', 'wrangler.jsonc'), 'utf8');
	text = text.replace(/\t"\$schema":[^\n]+\n/, '');
	text = text.replace('"main": "src/index.ts"', '"main": "index.js"');
	text = text.replaceAll('"directory": "../web/build"', '"directory": "../web"');
	if (!text.includes('"send_metrics"')) {
		text = text.replace('"name": "judgesroom-com"', '"name": "judgesroom-com",\n\t"send_metrics": false');
	}
	writeFileSync(dest, text);
}

function resolveWranglerJs(runtimeDir: string): string {
	const pkgPath = join(runtimeDir, 'node_modules', 'wrangler', 'package.json');
	if (!existsSync(pkgPath)) {
		throw new Error('wrangler was not installed into runtime/node_modules');
	}
	const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { bin?: string | Record<string, string> };
	const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.wrangler;
	if (!bin) {
		throw new Error('wrangler package.json has no bin.wrangler');
	}
	return join('runtime', 'node_modules', 'wrangler', bin).replaceAll('\\', '/');
}

function readAppVersion(): string {
	const text = readFileSync(APP_FILE, 'utf8');
	const match = text.match(VERSION_RE);
	if (!match) {
		throw new Error(`Could not read App.version from ${APP_FILE}`);
	}
	return match[1];
}

function writeLauncher(staging: string, target: Target, wranglerJs: string, version: string) {
	const template = readFileSync(join(TEMPLATES_DIR, target.launcherFile), 'utf8');
	const nodeBin = target.nodeBinInRuntime.replaceAll('/', target.id.startsWith('windows') ? '\\' : '/');
	const wranglerRel = wranglerJs.replaceAll('/', target.id.startsWith('windows') ? '\\' : '/');
	const body = template
		.replaceAll('{{NODE_BIN}}', nodeBin)
		.replaceAll('{{WRANGLER_JS}}', wranglerRel)
		.replaceAll('{{VERSION}}', version);
	const dest = join(staging, target.launcherFile);
	writeFileSync(dest, body);
	if (target.id === 'macos-arm64') {
		chmodSync(dest, 0o755);
	}
}

function zipStaging(staging: string, zipPath: string, target: Target) {
	rmSync(zipPath, { force: true });
	const parent = dirname(staging);
	const folder = staging.split(/[/\\]/).pop()!;
	if (target.id === 'macos-arm64') {
		chmodSync(join(staging, target.launcherFile), 0o755);
		const nodeBin = join(staging, target.nodeBinInRuntime);
		if (existsSync(nodeBin)) {
			chmodSync(nodeBin, 0o755);
		}
	}
	run('zip', ['-q', '-r', '-X', '-y', zipPath, folder], parent);
}

async function main() {
	const { target, skipWebBuild, skipWorkerBuild } = parseArgs(process.argv.slice(2));
	const webBuild = join(ROOT, 'web', 'build');
	if (!skipWebBuild || !existsSync(join(webBuild, 'index.html'))) {
		console.log('Building web app…');
		run('bun', ['run', 'build'], join(ROOT, 'web'));
	}
	if (!existsSync(join(webBuild, 'index.html'))) {
		throw new Error('web/build is missing. Run bun run build in web/ first.');
	}

	mkdirSync(DIST_DIR, { recursive: true });

	const workerBundle = skipWorkerBuild && existsSync(join(ROOT, 'worker', 'dist', 'index.js'))
		? join(ROOT, 'worker', 'dist')
		: join(DIST_DIR, 'worker-build');
	if (workerBundle !== join(ROOT, 'worker', 'dist')) {
		console.log('Building Worker bundle…');
		buildWorkerBundle(workerBundle);
	} else {
		console.log('Using existing worker/dist bundle');
	}

	const nodeVersion = NODE_VERSION;
	const version = readAppVersion();
	console.log(
		`Packing Judges Room Standalone ${version} (${target.id}) with Node ${nodeVersion} and wrangler ${WRANGLER_VERSION}`
	);

	const archiveName =
		target.nodeArchiveKind === 'zip'
			? `node-v${nodeVersion}-win-x64.zip`
			: `node-v${nodeVersion}-darwin-arm64.tar.gz`;
	const archiveUrl = `https://nodejs.org/dist/v${nodeVersion}/${archiveName}`;
	const archivePath = join(CACHE_DIR, archiveName);
	await download(archiveUrl, archivePath);

	const extractDir = join(CACHE_DIR, `extract-${target.id}-${nodeVersion}`);
	extractArchive(archivePath, extractDir, target.nodeArchiveKind);
	const nodeRoot = join(extractDir, target.nodeDirName(nodeVersion));
	if (!existsSync(join(nodeRoot, target.nodeBinInArchive))) {
		throw new Error(`Node binary missing in ${nodeRoot}`);
	}

	mkdirSync(DIST_DIR, { recursive: true });
	const staging = join(DIST_DIR, 'judgesroom-standalone');
	rmSync(staging, { recursive: true, force: true });
	mkdirSync(join(staging, 'runtime'), { recursive: true });

	const runtimeNodeDest = join(staging, target.nodeBinInRuntime);
	mkdirSync(dirname(runtimeNodeDest), { recursive: true });
	cpSync(join(nodeRoot, target.nodeBinInArchive), runtimeNodeDest);
	if (target.id === 'macos-arm64') {
		chmodSync(runtimeNodeDest, 0o755);
	}

	copyWorkerBundle(workerBundle, join(staging, 'worker'));
	writePackagedWranglerConfig(join(staging, 'worker', 'wrangler.jsonc'));
	cpSync(webBuild, join(staging, 'web'), { recursive: true });
	cpSync(join(TEMPLATES_DIR, 'README.txt'), join(staging, 'README.txt'));
	cpSync(join(ROOT, 'LICENSE'), join(staging, 'LICENSE'));

	console.log(`Installing wrangler@${WRANGLER_VERSION} for ${target.npmOs}/${target.npmCpu}…`);
	writeFileSync(
		join(staging, 'runtime', 'package.json'),
		JSON.stringify({ name: 'judgesroom-standalone-runtime', private: true, dependencies: { wrangler: WRANGLER_VERSION } }, null, 2) +
			'\n'
	);
	run(
		'npm',
		[
			'install',
			'--omit=dev',
			'--ignore-scripts',
			'--no-fund',
			'--no-audit',
			`--os=${target.npmOs}`,
			`--cpu=${target.npmCpu}`
		],
		join(staging, 'runtime')
	);

	const workerdDir = join(staging, 'runtime', 'node_modules', ...target.workerdPackage.split('/'));
	if (!existsSync(workerdDir)) {
		console.log(`workerd optional package missing; installing ${target.workerdPackage}…`);
		run(
			'npm',
			[
				'install',
				'--omit=dev',
				'--ignore-scripts',
				'--no-fund',
				'--no-audit',
				`--os=${target.npmOs}`,
				`--cpu=${target.npmCpu}`,
				target.workerdPackage
			],
			join(staging, 'runtime')
		);
	}
	if (!existsSync(workerdDir)) {
		throw new Error(`Expected ${target.workerdPackage} under runtime/node_modules after npm install`);
	}

	const wranglerJs = resolveWranglerJs(join(staging, 'runtime'));
	writeLauncher(staging, target, wranglerJs, version);

	const zipName = `judgesroom-standalone-${target.id}.zip`;
	const zipPath = join(DIST_DIR, zipName);
	console.log(`Writing ${zipName}…`);
	zipStaging(staging, zipPath, target);

	console.log(`Packed ${relative(ROOT, zipPath)}`);
}

try {
	await main();
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
