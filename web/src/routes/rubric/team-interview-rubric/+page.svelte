<script lang="ts">
	import '$lib/components/workspace/tabs/rubric.css';
	import TeamInterviewRubricTable from '$lib/components/workspace/tabs/TeamInterviewRubricTable.svelte';
	import { sanitizeHTMLMessage } from '$lib/i18n';
	import { app } from '$lib/index.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { setLocale, getLocale, type Locale } from '$lib/paraglide/runtime';

	// Default values for the rubric
	let rubricScores = $state([-1, -1, -1, -1, -1, -1, -1, -1, -1]);
	let notes = $state('');
	let isSubmitted = $state(false);
	let showValidationErrors = $state(false);

	function handlePrint() {
		window.print();
	}

	function handleLanguageChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const language = target.value;
		setLocale(language as Locale);
	}
</script>

<svelte:head>
	<title>Team Interview Rubric - Print | judgesroom.com</title>
</svelte:head>

<div class="min-h-screen">
	<!-- Print Button - Hidden during printing -->
	<div class="no-print sticky top-0 z-10 mb-6 border-b bg-white px-6 py-4 shadow-sm">
		<div class="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<h1 class="text-2xl font-bold text-gray-800">{m.team_interview_rubric()}</h1>
			<div class="flex flex-wrap items-center gap-3">
				<!-- Language Selector -->
				<select
					id="language-select"
					onchange={handleLanguageChange}
					value={getLocale()}
					class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
				>
					<option value="en">English</option>
					<option value="zh-hk">繁體中文</option>
				</select>

				<!-- Print Button -->
				<button class="primary" onclick={handlePrint}>
					<svg class="mr-2 inline-block h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
						></path>
					</svg>
					Print
				</button>
			</div>
		</div>
	</div>

	<!-- Rubric Content -->
	<div class="flex justify-center">
		<div class="max-w-full bg-white p-6">
			<div class="mx-auto max-w-4xl">
				<!-- Team Information Section - Visible only in print -->
				<div class="pb-4">
					<h2 class="text-center text-2xl font-bold">{m.team_interview_rubric()}</h2>
					<div class="rubric-metadata">
						<div>
							<span class="font-semibold">{m.team_hash()}</span>
							<span class="inline-block border-gray-400 pb-1">_______________</span>
						</div>
						<div class="flex flex-row items-center gap-1">
							{#snippet square()}
								<svg class="inline-block h-3 w-3">
									<rect width="100%" height="100%" stroke="black" fill="transparent" stroke-width="3" />
								</svg>
							{/snippet}
							<span class="font-semibold">{m.grade_level_colon()}</span>
							<span class="flex items-center gap-1 font-semibold">{@render square()} ES | </span>
							<span class="flex items-center gap-1 font-semibold">{@render square()} MS | </span>
							<span class="flex items-center gap-1 font-semibold">{@render square()} HS | </span>
							<span class="flex items-center gap-1 font-semibold">{@render square()} University</span>
						</div>
						<div>
							<span class="font-semibold">{m.judge_name_colon()}</span>
							<span class="inline-block border-gray-400 pb-1">___________________________</span>
						</div>
					</div>
				</div>

				<!-- Rubric Table -->
				<p class="mb-2 text-sm text-gray-600">
					{@html sanitizeHTMLMessage(m.team_interview_rubric_directions)}
				</p>
				<TeamInterviewRubricTable bind:rubricScores bind:notes {isSubmitted} {showValidationErrors} />
				<p class="mt-2 text-center text-xs italic">
					{m.judging_materials_strictly_confidential_description()}
				</p>
				<p class="mt-2 text-xs text-gray-500">
					{m.rubric_print_license()}<br />{m.rubric_print_version({ version: app.version })}
				</p>
			</div>
		</div>
	</div>
</div>

<style lang="postcss">
	@reference 'tailwindcss';

	/* Print-specific styles */
	@media print {
		/* Hide elements that shouldn't be printed */
		.no-print {
			display: none !important;
		}

		.rubric-metadata {
			@apply flex flex-row gap-10;
		}

		/* Optimize page for printing */
		:global(*) {
			print-color-adjust: exact !important;
			-webkit-print-color-adjust: exact !important;
			color-adjust: exact !important;
		}

		:global(html) {
			font-size: 12px !important;
		}

		:global(body) {
			background: white !important;
			font-family:
				'Helvetica Neue', Helvetica, Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', 'WenQuanYi Micro Hei',
				'Noto Sans CJK SC', 'Source Han Sans SC', sans-serif !important;
		}

		/* Page setup */
		@page {
			margin: 0.5cm;
		}

		/* Ensure content fits on page */
		:global(html),
		:global(body) {
			width: 100%;
			height: 100%;
		}

		/* Remove shadows and unnecessary styling for print */
		div {
			box-shadow: none !important;
		}

		/* Make sure the rubric table prints correctly */
		:global(rubric-table) {
			/* page-break-inside: avoid; */
		}

		/* Avoid page breaks inside rows */
		:global(rubric-table row) {
			page-break-inside: avoid;
			break-inside: avoid;
		}

		:global(button) {
			display: none !important;
		}
	}

	/* Screen-specific styles */
	@media screen {
		.no-print {
			display: block;
		}

		.rubric-metadata {
			@apply flex flex-col gap-2 text-sm lg:flex-row lg:gap-10;
		}
	}

	:global {
		body {
			@apply bg-slate-100;
		}

		#total-score {
			@apply invisible;
		}

		rubric-table button {
			@apply hidden;
		}
	}
</style>
