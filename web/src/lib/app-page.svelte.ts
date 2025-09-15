import { App, AppStorage } from '$lib/app.svelte';
import type { Component } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import { TabController } from '$lib/tab.svelte';
import type { AwardRankingsFullUpdate } from '@judging.jerryio/protocol/src/rubric';

// ============================================================================
// Dialog System
// ============================================================================

// Base dialog interface
interface BaseDialog {
	id: string;
	type: string;
}

// Confirmation dialog
export interface ConfirmationDialog extends BaseDialog {
	type: 'confirmation';
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	confirmButtonClass?: string;
	cancelButtonClass?: string;
}

// Prompt dialog
export interface PromptDialog extends BaseDialog {
	type: 'prompt';
	title: string;
	message: string;
	placeholder?: string;
	defaultValue?: string;
	inputType?: 'text' | 'email' | 'url' | 'password';
	confirmText?: string;
	cancelText?: string;
}

// Custom dialog
export interface CustomDialog extends BaseDialog {
	type: 'custom';
	component: Component; // Svelte component constructor
	props: Record<string, unknown>;
	maxWidth?: string;
}

export type Dialog = ConfirmationDialog | PromptDialog | CustomDialog;

export class DialogController {
	private dialogs: Dialog[] = $state([]);
	private resolvers = new SvelteMap<string, (result: unknown) => void>();

	get currentDialog() {
		return this.dialogs[this.dialogs.length - 1] || null;
	}

	get hasDialogs() {
		return this.dialogs.length > 0;
	}

	private generateId(): string {
		return `dialog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Show confirmation dialog
	 */
	showConfirmation(options: Omit<ConfirmationDialog, 'id' | 'type'>): Promise<boolean> {
		const id = this.generateId();
		const dialog: ConfirmationDialog = {
			id,
			type: 'confirmation',
			confirmText: 'Confirm',
			cancelText: 'Cancel',
			confirmButtonClass: 'primary',
			cancelButtonClass: 'secondary',
			...options
		};

		return new Promise<boolean>((resolve) => {
			this.resolvers.set(id, (result: unknown) => resolve(result as boolean));
			this.dialogs.push(dialog);
		});
	}

	/**
	 * Show prompt dialog
	 */
	showPrompt(options: Omit<PromptDialog, 'id' | 'type'>): Promise<string | null> {
		const id = this.generateId();
		const dialog: PromptDialog = {
			id,
			type: 'prompt',
			inputType: 'text',
			confirmText: 'OK',
			cancelText: 'Cancel',
			defaultValue: '',
			placeholder: '',
			...options
		};

		return new Promise<string | null>((resolve) => {
			this.resolvers.set(id, (result: unknown) => resolve(result as string | null));
			this.dialogs.push(dialog);
		});
	}

	/**
	 * Show custom dialog with improved type safety
	 */
	showCustom<TProps extends Record<string, unknown>>(
		component: Component<TProps>,
		options: {
			props: TProps;
			maxWidth?: string;
		}
	): Promise<unknown>;

	showCustom(
		component: Component,
		options: {
			props: Record<string, unknown>;
			maxWidth?: string;
		}
	): Promise<unknown> {
		const id = this.generateId();
		const dialog: CustomDialog = {
			id,
			type: 'custom',
			component,
			props: options.props,
			maxWidth: options.maxWidth || 'max-w-md'
		};

		return new Promise<unknown>((resolve) => {
			this.resolvers.set(id, resolve);
			this.dialogs.push(dialog);
		});
	}

	/**
	 * Close current dialog with result
	 */
	closeDialog(result?: unknown): void {
		if (this.dialogs.length === 0) return;

		const dialog = this.dialogs.pop();
		if (dialog) {
			const resolver = this.resolvers.get(dialog.id);
			if (resolver) {
				resolver(result);
				this.resolvers.delete(dialog.id);
			}
		}
	}

	/**
	 * Close all dialogs
	 */
	closeAllDialogs(): void {
		// Resolve all pending dialogs with null/false
		while (this.dialogs.length > 0) {
			const dialog = this.dialogs.pop();
			if (dialog) {
				const resolver = this.resolvers.get(dialog.id);
				if (resolver) {
					const defaultResult = dialog.type === 'confirmation' ? false : null;
					resolver(defaultResult);
					this.resolvers.delete(dialog.id);
				}
			}
		}
	}
}

// ============================================================================
// App State
// ============================================================================

export type AppPhase = 'loading' | 'choose_action' | 'event_setup' | 'session_setup' | 'joining_session' | 'role_selection' | 'workspace';

export const AppUI = $state({
	appPhase: 'loading'
});

export const app = new App(new AppStorage(), import.meta.env.DEV);
export const dialogs = new DialogController();
export const tabs = new TabController();

export interface SubscriptionsStorage {
	allJudgeGroupsAwardRankings: Record<string, AwardRankingsFullUpdate>;
}

export const subscriptions: SubscriptionsStorage = $state({
	allJudgeGroupsAwardRankings: {}
});
