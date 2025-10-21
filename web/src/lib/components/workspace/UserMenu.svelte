<script lang="ts">
	import { app, AppUI, dialogs } from '$lib/index.svelte';
	import GearIcon from '$lib/icon/GearIcon.svelte';
	import LeaveDoorIcon from '$lib/icon/LeaveDoorIcon.svelte';
	import ShareIcon from '$lib/icon/ShareIcon.svelte';
	import TrashBinIcon from '$lib/icon/TrashBinIcon.svelte';
	import UserIcon from '$lib/icon/UserIcon.svelte';
	import DestroyDialog from './DestroyDialog.svelte';
	import ShareDialog from './ShareDialog.svelte';
	import RoleSelectionDialog from './RoleSelectionDialog.svelte';
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

	async function handleLeaveJudgesRoom() {
		closeMenu();

		const confirmed = await dialogs.showConfirmation({
			title: 'Leave Judges\' Room',
			message: 'Are you sure you want to leave the Judges\' Room? You will lose connection to other judges.',
			confirmText: 'Leave Judges\' Room',
			cancelText: 'Cancel',
			confirmButtonClass: 'danger'
		});

		if (confirmed) {
			app.leaveJudgesRoom();
			AppUI.appPhase = 'begin';
		}
	}

	async function handleDestroy() {
		closeMenu();

		if (!isJudgeAdvisor) {
			await dialogs.showConfirmation({
				title: 'Permission Denied',
				message: 'This action is available for Judge Advisors only.',
				confirmText: 'OK',
				cancelText: '',
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
			await dialogs.showConfirmation({
				title: 'Permission Denied',
				message: 'This action is available for Judge Advisors only.',
				confirmText: 'OK',
				cancelText: '',
				confirmButtonClass: 'primary'
			});
			return;
		}

		const confirmed = await dialogs.showConfirmation({
			title: 'Change Event Setup',
			message: 'Are you sure you want to modify the event setup? This could disrupt ongoing judging activities.',
			confirmText: 'Continue',
			cancelText: 'Cancel',
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
		<span class="sm:inline">Menu</span>
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
				<span>Share Judges' Room</span>
			</button>

			<!-- Switch Role -->
			<button onclick={handleSwitchRole} class="menu-item" role="menuitem">
				<span class="mr-3">
					<UserIcon />
				</span>
				<span>Switch Role</span>
			</button>

			<!-- Leave Judges' Room -->
			<button onclick={handleLeaveJudgesRoom} class="menu-item danger" role="menuitem">
				<span class="mr-3">
					<LeaveDoorIcon />
				</span>
				<span>Leave Judges' Room</span>
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
				<span>Destroy</span>
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
				<span>Change Event Setup</span>
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
