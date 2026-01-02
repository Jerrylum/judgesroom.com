<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { setLocale, getLocale, type Locale } from '$lib/paraglide/runtime';
	import { app, dialogs } from '$lib/index.svelte';
	import CloseIcon from '$lib/icon/CloseIcon.svelte';
	import Dialog from '$lib/components/dialog/Dialog.svelte';

	let enableGoogleAnalytics = $state(app.getPreferences().get('isGoogleAnalyticsEnabled'));

	function handleClose() {
		dialogs.closeDialog();
	}

	function handleLanguageChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const language = target.value;
		setLocale(language as Locale, { reload: true });
	}

	// Sync Google Analytics state
	$effect(() => {
		app.getPreferences().set('isGoogleAnalyticsEnabled', enableGoogleAnalytics);
	});
</script>

<Dialog open={true} onClose={handleClose} innerContainerClass="max-w-lg">
	<div class="space-y-6">
		<!-- Title -->
		<div class="flex flex-col">
			<div class="flex items-center justify-between">
				<h3 id="dialog-title" class="text-lg font-semibold text-gray-900">{m.preferences()}</h3>
				<button
					onclick={handleClose}
					class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
					aria-label="Close dialog"
				>
					<CloseIcon size={24} />
				</button>
			</div>
		</div>

		<div class="space-y-6">
			<!-- Language Selection -->
			<div class="space-y-2">
				<label for="language-select" class="block text-sm font-medium text-gray-700">{m.language()}</label>
				<select id="language-select" onchange={handleLanguageChange} value={getLocale()} class="classic w-full">
					<option value="en">English</option>
					<option value="zh-hk">繁體中文 (香港)</option>
				</select>
			</div>

			<!-- Google Analytics -->
			<div class="space-y-2">
				<label class="flex cursor-pointer items-start space-x-3">
					<input type="checkbox" bind:checked={enableGoogleAnalytics} class="mt-1" />
					<div class="flex-1">
						<div class="text-sm font-medium text-gray-900">{m.enable_google_analytics()}</div>
						<p class="mt-1 text-xs text-gray-600">
							{m.help_us_improve_judgesroom_com_short()}
						</p>
					</div>
				</label>
			</div>
		</div>

		<!-- Close Button -->
		<div class="flex justify-end">
			<button onclick={handleClose} class="primary">{m.close_dialog_text()}</button>
		</div>
	</div>
</Dialog>
