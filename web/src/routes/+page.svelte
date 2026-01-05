<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { setLocale, getLocale, type Locale } from '$lib/paraglide/runtime';

	const props = $props();

	function handleLanguageChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const language = target.value;
		setLocale(language as Locale, { reload: true });
	}
</script>

<svelte:head>
	<title>{m.home()} | judgesroom.com</title>
</svelte:head>

<div class="min-h-screen bg-slate-100">
	<!-- Hero Section -->
	<div class="bg-linear-to-br from-slate-800 to-slate-900 text-white">
		<div class="mx-auto max-w-6xl px-6 py-16 md:py-24">
			<div class="text-center">
				<h1 class="mb-6 text-5xl font-bold md:text-6xl">judgesroom.com</h1>
				<p class="mb-8 text-xl text-slate-300 md:text-2xl">{m.home_hero_subtitle()}</p>
				<p class="mx-auto mb-10 max-w-3xl text-lg leading-relaxed text-slate-200">
					{m.home_hero_description()}
				</p>
				<div class="flex flex-col justify-center gap-4 sm:flex-row">
					<a href="/app">
						<button class="primary w-full sm:w-auto">{m.home_get_started()}</button>
					</a>
					<a href="https://github.com/Jerrylum/judgesroom.com" target="_blank" rel="noopener noreferrer">
						<button class="lightweight w-full sm:w-auto">{m.home_view_on_github()}</button>
					</a>
				</div>
			</div>
		</div>
	</div>

	<!-- Introduction Video Section -->
	<div class="mx-auto max-w-6xl px-6 py-16">
		<div class="mb-12 text-center">
			<h2 class="mb-4 text-3xl font-bold text-slate-900 md:text-4xl">{m.home_introduction()}</h2>
			<p class="mx-auto max-w-2xl text-lg text-gray-600">{m.home_introduction_description()}</p>
		</div>

		<div class="rounded-lg bg-white p-4 shadow-lg md:p-8">
			<div class="aspect-video w-full overflow-hidden rounded-lg bg-slate-200">
				<iframe
					class="h-full w-full"
					src="https://www.youtube.com/embed/iNEQAdeVgOM"
					title={m.home_introduction()}
					frameborder="0"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowfullscreen
				></iframe>
			</div>
		</div>
	</div>

	<!-- Training Videos Section -->
	<div class="bg-white py-16">
		<div class="mx-auto max-w-6xl px-6">
			<div class="mb-12 text-center">
				<h2 class="mb-4 text-3xl font-bold text-slate-900 md:text-4xl">{m.home_training_resources()}</h2>
				<p class="mx-auto max-w-2xl text-lg text-gray-600">{m.home_training_resources_description()}</p>
			</div>

			<div class="grid gap-8 md:grid-cols-2">
				<!-- Judges Training Video -->
				<div class="rounded-lg bg-slate-50 p-6 shadow-md transition-shadow hover:shadow-lg">
					<div class="mb-4 flex items-center">
						<div class="mr-4 rounded-full bg-slate-200 p-3">
							<svg class="h-8 w-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
								></path>
							</svg>
						</div>
						<h3 class="text-2xl font-semibold text-slate-900">{m.home_judges_training()}</h3>
					</div>
					<p class="mb-6 text-gray-600">
						{m.home_judges_training_description()}
					</p>
					<a
						onclick={() => {
							alert('Coming soon');
						}}
						href="/"
						class="inline-flex items-center font-medium text-slate-800 transition-colors hover:text-slate-600"
					>
						<span>{m.home_watch_training_video()}</span>
						<svg class="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
						</svg>
					</a>
				</div>

				<!-- Judge Advisor Training Video -->
				<div class="rounded-lg bg-slate-50 p-6 shadow-md transition-shadow hover:shadow-lg">
					<div class="mb-4 flex items-center">
						<div class="mr-4 rounded-full bg-slate-200 p-3">
							<svg class="h-8 w-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
								></path>
							</svg>
						</div>
						<h3 class="text-2xl font-semibold text-slate-900">{m.home_judge_advisor_training()}</h3>
					</div>
					<p class="mb-6 text-gray-600">
						{m.home_judge_advisor_training_description()}
					</p>
					<a
						onclick={() => {
							alert('Coming soon');
						}}
						href="/"
						class="inline-flex items-center font-medium text-slate-800 transition-colors hover:text-slate-600"
					>
						<span>{m.home_watch_training_video()}</span>
						<svg class="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
						</svg>
					</a>
				</div>
			</div>
		</div>
	</div>

	<!-- Features Highlight -->
	<!-- <div class="mx-auto max-w-6xl px-6 py-16">
		<div class="mb-12 text-center">
			<h2 class="mb-4 text-3xl font-bold text-slate-900 md:text-4xl">Key Features</h2>
		</div>

		<div class="grid gap-8 md:grid-cols-3">
			<div class="rounded-lg bg-white p-6 shadow-md">
				<div class="mb-4 text-slate-700">
					<svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						></path>
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-semibold text-slate-900">Digital Rubrics</h3>
				<p class="text-gray-600">Submit and manage interview and engineering notebook rubrics digitally, eliminating paper workflows.</p>
			</div>

			<div class="rounded-lg bg-white p-6 shadow-md">
				<div class="mb-4 text-slate-700">
					<svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
						></path>
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-semibold text-slate-900">Real-time Collaboration</h3>
				<p class="text-gray-600">Share the same Judges' Room across multiple devices for seamless team collaboration.</p>
			</div>

			<div class="rounded-lg bg-white p-6 shadow-md">
				<div class="mb-4 text-slate-700">
					<svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
						></path>
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-semibold text-slate-900">Confidentiality</h3>
				<p class="text-gray-600">Keep all judging materials secure and easily destroy them after the event, ensuring RECF compliance.</p>
			</div>
		</div>
	</div> -->

	<!-- CTA Section -->
	<div class="bg-slate-800 py-16 text-white">
		<div class="mx-auto max-w-4xl px-6 text-center">
			<h2 class="mb-4 text-3xl font-bold md:text-4xl">{m.home_cta_title()}</h2>
			<p class="mb-8 text-lg text-slate-300">{m.home_cta_description()}</p>
			<div class="flex flex-col justify-center gap-4 sm:flex-row">
				<a href="/app">
					<button class="primary w-full sm:w-auto">{m.home_launch_application()}</button>
				</a>
				<a href="/privacy">
					<button class="lightweight w-full sm:w-auto">{m.home_privacy_security()}</button>
				</a>
			</div>
		</div>
	</div>

	<!-- Footer -->
	<div class="bg-slate-900 py-12 text-slate-400">
		<div class="mx-auto max-w-6xl px-6">
			<div class="flex flex-wrap justify-center gap-6 text-center">
				<!-- Discord Support -->
				<a
					href="https://discord.gg/BpSDTgq7Zm"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-2 transition-colors hover:text-white"
				>
					<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
						></path>
					</svg>
					<span>{m.home_discord_support()}</span>
				</a>

				<!-- YouTube Channel -->
				<a
					href="https://www.youtube.com/channel/UCu1sG0NWOTJMN25XpuFsttQ"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-2 transition-colors hover:text-white"
				>
					<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
						></path>
					</svg>
					<span>{m.home_youtube_channel()}</span>
				</a>

				<!-- GitHub -->
				<a
					href="https://github.com/Jerrylum/judgesroom.com"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-2 transition-colors hover:text-white"
				>
					<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
						<path
							fill-rule="evenodd"
							d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
							clip-rule="evenodd"
						></path>
					</svg>
					<span>GitHub</span>
				</a>
			</div>
		</div>
	</div>
</div>

<!-- Language Selector -->
<div class="fixed right-4 top-4 p-1">
	<select onchange={handleLanguageChange} value={getLocale()} class="rounded border border-slate-300 bg-white/90 px-2 py-1 text-sm text-slate-700 shadow-sm backdrop-blur-sm">
		<option value="en">English</option>
		<option value="zh-hk">繁體中文 (香港)</option>
	</select>
</div>

<style lang="postcss">
	@reference 'tailwindcss';

	:global {
		body {
			@apply bg-slate-100;
		}
	}
</style>
