<script lang="ts">
	import { app, AppUI, dialogs } from '$lib/app-page.svelte';
	import DestroyDialog from './DestroyDialog.svelte';
	import { onMount } from 'svelte';

	let isOpen = $state(false);
	let menuRef: HTMLDivElement | null = $state(null);
	let buttonRef: HTMLButtonElement | null = $state(null);

	const currentUser = $derived(app.getCurrentUser());
	const isJudgeAdvisor = $derived(currentUser?.role === 'judge_advisor');
	const isInSession = $derived(app.isInSession());
	const connectionState = $derived(app.getConnectionState());
	const isConnected = $derived(connectionState === 'connected');

	function toggleMenu() {
		isOpen = !isOpen;
	}

	function closeMenu() {
		isOpen = false;
	}

	function handleSwitchRole() {
		closeMenu();
		AppUI.appPhase = 'role_selection';
	}

	async function handleLeaveSession() {
		closeMenu();
		
		if (!isInSession) return;
		
		const confirmed = await dialogs.showConfirmation({
			title: 'Leave Session',
			message: 'Are you sure you want to leave the session? You will lose connection to other judges.',
			confirmText: 'Leave Session',
			cancelText: 'Cancel',
			confirmButtonClass: 'danger'
		});

		if (confirmed) {
			app.leaveSession();
			AppUI.appPhase = 'choose_action';
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
		if (
			menuRef &&
			buttonRef &&
			!menuRef.contains(event.target as Node) &&
			!buttonRef.contains(event.target as Node)
		) {
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
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M4 6h16M4 12h16M4 18h16"
			/>
		</svg>
		<span class="sm:inline">Menu</span>
	</button>

	<!-- Context Menu -->
	{#if isOpen}
		<div
			bind:this={menuRef}
			class="absolute top-full right-0 z-50 mt-1 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
			role="menu"
			aria-orientation="vertical"
			aria-labelledby="menu-button"
		>
			<!-- Switch Role -->
			<button
				onclick={handleSwitchRole}
				class="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
				role="menuitem"
			>
				<svg class="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z"
					/>
				</svg>
				Switch Role
			</button>

			<!-- Leave Session -->
			{#if isInSession}
				<button
					onclick={handleLeaveSession}
					disabled={!isConnected}
					class="flex w-full items-center px-4 py-2 text-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
					class:text-red-700={isConnected}
					class:text-gray-400={!isConnected}
					role="menuitem"
				>
					<svg class="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
						/>
					</svg>
					Leave Session
				</button>
			{/if}

			<!-- Divider -->
			<div class="my-1 border-t border-gray-100"></div>

			<!-- Destroy -->
			<button
				onclick={handleDestroy}
				disabled={!isJudgeAdvisor}
				class="flex w-full items-center px-4 py-2 text-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
				class:text-red-700={isJudgeAdvisor}
				class:text-gray-400={!isJudgeAdvisor}
				role="menuitem"
				title={isJudgeAdvisor ? '' : 'Available for Judge Advisors only'}
			>
				<svg class="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
					/>
				</svg>
				Destroy
			</button>

			<!-- Change Event Setup -->
			<button
				onclick={handleChangeEventSetup}
				disabled={!isJudgeAdvisor}
				class="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
				class:text-gray-400={!isJudgeAdvisor}
				role="menuitem"
				title={isJudgeAdvisor ? '' : 'Available for Judge Advisors only'}
			>
				<svg class="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
					/>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
				Change Event Setup
			</button>
		</div>
	{/if}
</div>
