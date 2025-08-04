<script lang="ts">
	import { useWRPC } from '../lib/use-wrpc';
	import { subscribeToClientState, getClientState } from '../lib/client-state';
	import { onMount, onDestroy } from 'svelte';


	const wrpc = useWRPC();

	let name = '';
	let ageResult = '';
	let clientState = getClientState();

	// Subscribe to client state updates
	const unsubscribeFromClientState = subscribeToClientState((newState) => {
		clientState = newState;
	});

	onMount(async () => {
		try {
			// Test query - call server's getName procedure
			const nameResult = await wrpc.getName.query('Jerry');
			name = nameResult;
			console.log('Name result:', nameResult);
		} catch (error) {
			console.error('Error calling getName:', error);
		}
	});

	onDestroy(() => {
		unsubscribeFromClientState();
	});

	async function setAge() {
		try {
			const age = 20 + Math.floor(Math.random() * 30); // Random age between 20-49
			const result = await wrpc.setAge.mutation(age);
			ageResult = result;
			console.log('Age result:', result);
		} catch (error) {
			console.error('Error calling setAge:', error);
		}
	}
</script>

<h1>wRPC Test</h1>
<p>This demonstrates the end-to-end type-safe RPC framework for Cloudflare WebSocket Hibernation API.</p>

<div class="demo-section">
	<h2>Query Test</h2>
	<p>Name from server: <strong>{name || 'Loading...'}</strong></p>
</div>

<div class="demo-section">
	<h2>Mutation Test</h2>
	<button on:click={setAge}>Set Random Age</button>
	{#if ageResult}
		<p>Result: <strong>{ageResult}</strong></p>
	{/if}
</div>

<div class="demo-section">
	<h2>Server-to-Client Communication</h2>
	<p>When you click "Set Random Age", the server will also call the client's <code>updateAge</code> procedure.</p>
	<p>Check the browser console to see the client-side procedure being called.</p>
	<p>Server call count: <strong>{clientState.serverCallCount}</strong></p>
	{#if clientState.lastUpdateAge > 0}
		<p>Last age update from server: <strong>{clientState.lastUpdateAge}</strong></p>
	{/if}
</div>

<style>
	.demo-section {
		margin: 2rem 0;
		padding: 1rem;
		border: 1px solid #ccc;
		border-radius: 8px;
	}

	.demo-section h2 {
		margin-top: 0;
	}

	button {
		margin: 0.5rem 0.5rem 0.5rem 0;
		padding: 0.5rem 1rem;
		background: #007acc;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	button:hover {
		background: #005c99;
	}
</style>
