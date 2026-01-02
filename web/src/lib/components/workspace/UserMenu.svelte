<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { app, AppUI, dialogs } from '$lib/index.svelte';
	import GearIcon from '$lib/icon/GearIcon.svelte';
	import LeaveDoorIcon from '$lib/icon/LeaveDoorIcon.svelte';
	import SettingsIcon from '$lib/icon/SettingsIcon.svelte';
	import ShareIcon from '$lib/icon/ShareIcon.svelte';
	import TrashBinIcon from '$lib/icon/TrashBinIcon.svelte';
	import UserIcon from '$lib/icon/UserIcon.svelte';
	import DestroyDialog from './DestroyDialog.svelte';
	import ShareDialog from './ShareDialog.svelte';
	import RoleSelectionDialog from './RoleSelectionDialog.svelte';
	import PreferencesDialog from './PreferencesDialog.svelte';
	import { onMount } from 'svelte';

	let isOpen = $state(false);
	let menuRef: HTMLDivElement | null = $state(null);
	let buttonRef: HTMLButtonElement | null = $state(null);

	const currentUser = $derived(app.getCurrentUser());
	const isJudgeAdvisor = $derived(currentUser?.role === 'judge_advisor');

	function toggleMenu() {
		isOpen = !isOpen;
	}

	function closeMenu() {
		isOpen = false;
	}

	function handleShareJudgesRoom() {
		closeMenu();
		dialogs.showCustom(ShareDialog, {
			props: {},
			maxWidth: 'max-w-4xl'
		});
	}

	function handleSwitchRole() {
		closeMenu();
		dialogs.showCustom(RoleSelectionDialog, { props: {} });
	}

	function handlePreferences() {
		closeMenu();
		dialogs.showCustom(PreferencesDialog, { props: {} });
	}

	async function handleLeaveJudgesRoom() {
		closeMenu();

		const confirmed = await dialogs.showConfirmation({
			title: m.leave_judges_room(),
			message: m.are_you_sure_you_want_to_leave_the_judges_room(),
			confirmText: m.leave_judges_room(),
			confirmButtonClass: 'danger'
		});

		if (confirmed) {
			// await app.leaveJudgesRoom();
			AppUI.appPhase = 'leaving';
		}
	}

	async function handleDestroy() {
		closeMenu();

		if (!isJudgeAdvisor) {
			await dialogs.showAlert({
				title: m.permission_denied(),
				message: m.this_action_is_available_for_judge_advisors_only(),
				confirmText: 'OK',
				confirmButtonClass: 'primary'
			});
			return;
		}

		// Import the DestroyDialog dynamically
		await dialogs.showCustom(DestroyDialog, {
			props: {},
			maxWidth: 'max-w-2xl'
		});
	}

	async function handleChangeEventSetup() {
		closeMenu();

		if (!isJudgeAdvisor) {
			await dialogs.showAlert({
				title: m.permission_denied(),
				message: m.this_action_is_available_for_judge_advisors_only(),
				confirmText: 'OK',
				confirmButtonClass: 'primary'
			});
			return;
		}

		const confirmed = await dialogs.showConfirmation({
			title: m.change_event_setup(),
			message: m.are_you_sure_you_want_to_modify_the_event_setup_this_could_disrupt_ongoing_judging_activities(),
			confirmText: m.continue_btn(),
			confirmButtonClass: 'primary'
		});

		if (confirmed) {
			AppUI.appPhase = 'event_setup';
		}
	}

	// Close menu when clicking outside
	function handleClickOutside(event: MouseEvent) {
		if (menuRef && buttonRef && !menuRef.contains(event.target as Node) && !buttonRef.contains(event.target as Node)) {
			closeMenu();
		}
	}

	// Close menu on escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			closeMenu();
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		document.addEventListener('keydown', handleKeydown);

		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<div class="relative">
	<!-- Menu Button -->
	<button
		bind:this={buttonRef}
		onclick={toggleMenu}
		class="flex items-center space-x-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:space-x-2"
		aria-label="Menu"
		aria-expanded={isOpen}
		aria-haspopup="true"
	>
		<!-- Hamburger Icon -->
		<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
		</svg>
		<span class="sm:inline">{m.menu()}</span>
	</button>

	<!-- Context Menu -->
	{#if isOpen}
		<div
			bind:this={menuRef}
			class="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
			role="menu"
			aria-orientation="vertical"
			aria-labelledby="menu-button"
		>
			<!-- Share Judges' Room -->
			<button onclick={handleShareJudgesRoom} class="menu-item" role="menuitem">
				<span class="mr-3">
					<ShareIcon />
				</span>
				<span>{m.share_judges_room()}</span>
			</button>

			<!-- Switch Role -->
			<button onclick={handleSwitchRole} class="menu-item" role="menuitem">
				<span class="mr-3">
					<UserIcon />
				</span>
				<span>{m.switch_role()}</span>
			</button>

			<!-- Preferences -->
			<button onclick={handlePreferences} class="menu-item" role="menuitem">
				<span class="mr-3">
					<SettingsIcon />
				</span>
				<span>{m.preferences()}</span>
			</button>

			<!-- Leave Judges' Room -->
			<button onclick={handleLeaveJudgesRoom} class="menu-item danger" role="menuitem">
				<span class="mr-3">
					<LeaveDoorIcon />
				</span>
				<span>{m.leave_judges_room()}</span>
			</button>

			<!-- Divider -->
			<div class="my-1 border-t border-gray-100"></div>

			<!-- Destroy -->
			<button
				onclick={handleDestroy}
				disabled={!isJudgeAdvisor}
				class="menu-item danger"
				class:text-red-700={isJudgeAdvisor}
				class:text-gray-400={!isJudgeAdvisor}
				role="menuitem"
				title={isJudgeAdvisor ? '' : 'Available for Judge Advisors only'}
			>
				<span class="mr-3">
					<TrashBinIcon />
				</span>
				<span>{m.destroy_judging_data()}</span>
			</button>

			<!-- Change Event Setup -->
			<button
				onclick={handleChangeEventSetup}
				disabled={!isJudgeAdvisor}
				class="menu-item"
				class:text-gray-400={!isJudgeAdvisor}
				role="menuitem"
				title={isJudgeAdvisor ? '' : 'Available for Judge Advisors only'}
			>
				<span class="mr-3">
					<GearIcon />
				</span>
				<span>{m.change_event_setup()}</span>
			</button>
		</div>
	{/if}
</div>

<style lang="postcss">
	@reference 'tailwindcss';

	.menu-item {
		@apply flex w-full items-center px-4 py-2 text-sm hover:bg-gray-100;

		&.danger {
			@apply bg-transparent text-red-700 hover:bg-red-50;
		}

		&:disabled {
			@apply cursor-not-allowed opacity-50;
		}
	}
</style>
