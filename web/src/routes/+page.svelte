<script lang="ts">
	import { useWRPC } from '../lib/use-wrpc';
	import { clientState } from '../lib/client-state.svelte.ts';
	import { onMount, onDestroy } from 'svelte';

	// Get WRPC client instance
	const wrpc = useWRPC();

	// Reactive state
	let loading = $state({
		name: false,
		time: false,
		age: false,
		notification: false,
		greeting: false
	});

	// Initialize on component mount
	onMount(async () => {
		await loadInitialData();
	});

	// Load initial server data
	async function loadInitialData() {
		try {
			loading.name = true;
			const nameResult = await wrpc.getName.query('Client User');
			clientState.serverName = nameResult;
			console.log('👋 Server name result:', nameResult);
		} catch (error) {
			console.error('Error calling getName:', error);
		} finally {
			loading.name = false;
		}
	}

	// Get current server time
	async function getServerTime() {
		try {
			loading.time = true;
			const timeResult = await wrpc.getServerTime.query();
			clientState.serverTime = new Date(timeResult).toLocaleString();
			console.log('🕰️ Server time:', timeResult);
		} catch (error) {
			console.error('Error getting server time:', error);
		} finally {
			loading.time = false;
		}
	}

	// Set random age (triggers server-to-client communication)
	async function setRandomAge() {
		try {
			loading.age = true;
			const age = 18 + Math.floor(Math.random() * 50); // Random age between 18-67
			const result = await wrpc.setAge.mutation(age);
			clientState.ageResult = result;
			console.log('🎂 Age result:', result);
		} catch (error) {
			console.error('Error calling setAge:', error);
		} finally {
			loading.age = false;
		}
	}

	// Send notification to all clients
	async function sendNotification() {
		try {
			loading.notification = true;
			const messages = [
				'Hello from the demo!',
				'WRPC is working great!',
				'Real-time communication test',
				'Broadcasting to all clients',
				'Type-safe WebSocket RPC'
			];
			const randomMessage = messages[Math.floor(Math.random() * messages.length)];
			const result = await wrpc.broadcastNotification.mutation(randomMessage);
			clientState.notificationResult = result;
			console.log('📢 Notification result:', result);
		} catch (error) {
			console.error('Error sending notification:', error);
		} finally {
			loading.notification = false;
		}
	}

	// Get greeting from this client (server calls client procedure)
	async function getClientGreeting() {
		try {
			loading.greeting = true;
			// Use a placeholder client ID - in real app this would be dynamic
			const result = await wrpc.getClientGreeting.mutation({
				clientId: 'placeholder-client-id',
				message: 'How are you doing?'
			});
			clientState.clientGreetingResult = result;
			console.log('💬 Client greeting result:', result);
		} catch (error) {
			console.error('Error getting client greeting:', error);
			clientState.clientGreetingResult = `Error: ${error}`;
		} finally {
			loading.greeting = false;
		}
	}
</script>

<h1>🌐 WRPC Demo</h1>
<p class="subtitle">Type-safe, bidirectional RPC over WebSockets with Cloudflare Workers & Hibernation API</p>

<!-- Client-to-Server Communication -->
<div class="demo-section">
	<h2>📞 Client → Server Communication</h2>
	<p>These buttons call server procedures from the client:</p>

	<div class="button-group">
		<button onclick={loadInitialData} disabled={loading.name} class="btn-primary">
			{loading.name ? 'Loading...' : 'Get Server Greeting'}
		</button>

		<button onclick={getServerTime} disabled={loading.time} class="btn-secondary">
			{loading.time ? 'Loading...' : 'Get Server Time'}
		</button>
	</div>

	<div class="results">
		{#if clientState.serverName}
			<p><strong>Server Greeting:</strong> {clientState.serverName}</p>
		{/if}
		{#if clientState.serverTime}
			<p><strong>Server Time:</strong> {clientState.serverTime}</p>
		{/if}
	</div>
</div>

<!-- Server-to-Client Communication -->
<div class="demo-section">
	<h2>📡 Server → Client Communication</h2>
	<p>These actions trigger the server to call procedures on connected clients:</p>

	<div class="button-group">
		<button onclick={setRandomAge} disabled={loading.age} class="btn-primary">
			{loading.age ? 'Processing...' : 'Set Random Age'}
		</button>

		<button onclick={sendNotification} disabled={loading.notification} class="btn-secondary">
			{loading.notification ? 'Sending...' : 'Broadcast Notification'}
		</button>
	</div>

	<div class="results">
		{#if clientState.ageResult}
			<p><strong>Age Result:</strong> {clientState.ageResult}</p>
		{/if}
		{#if clientState.notificationResult}
			<p><strong>Notification Result:</strong> {clientState.notificationResult}</p>
		{/if}
	</div>
</div>

<!-- Bidirectional Communication -->
<div class="demo-section">
	<h2>🔄 Bidirectional Communication</h2>
	<p>Server calls client procedure and gets a response:</p>

	<button onclick={getClientGreeting} disabled={loading.greeting} class="btn-accent">
		{loading.greeting ? 'Requesting...' : 'Get Client Greeting'}
	</button>

	{#if clientState.clientGreetingResult}
		<div class="results">
			<p><strong>Result:</strong> {clientState.clientGreetingResult}</p>
		</div>
	{/if}
</div>

<!-- Real-time State Updates -->
<div class="demo-section">
	<h2>📊 Real-time State Updates</h2>
	<p>This section shows live updates when the server calls client procedures:</p>

	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-number">{clientState.serverCallCount}</div>
			<div class="stat-label">Server Calls</div>
		</div>

		<div class="stat-card">
			<div class="stat-number">{clientState.connectedClients || 'N/A'}</div>
			<div class="stat-label">Connected Clients</div>
		</div>

		<div class="stat-card">
			<div class="stat-number">{clientState.lastUpdateAge || 'None'}</div>
			<div class="stat-label">Last Age Update</div>
		</div>
	</div>

	{#if clientState.lastNotification}
		<div class="notification-display">
			<strong>📢 Latest Notification:</strong>
			{clientState.lastNotification}
		</div>
	{/if}
</div>

<!-- Console Instructions -->
<div class="demo-section info-section">
	<h2>📝 Development Info</h2>
	<p>🔍 <strong>Check the browser console</strong> to see detailed logs of all RPC calls.</p>
	<p>📁 <strong>Open multiple tabs</strong> to test broadcasting between clients.</p>
	<p>🚀 <strong>All communication is type-safe</strong> with full TypeScript support.</p>
</div>

<style>
	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		line-height: 1.6;
		color: #333;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		min-height: 100vh;
		margin: 0;
		padding: 2rem;
	}

	h1 {
		text-align: center;
		color: white;
		margin-bottom: 0.5rem;
		font-size: 2.5rem;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.subtitle {
		text-align: center;
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 2rem;
		font-size: 1.1rem;
		max-width: 600px;
		margin-left: auto;
		margin-right: auto;
	}

	.demo-section {
		margin: 2rem 0;
		padding: 2rem;
		background: white;
		border-radius: 12px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		backdrop-filter: blur(10px);
	}

	.demo-section h2 {
		margin-top: 0;
		color: #2c3e50;
		border-bottom: 2px solid #3498db;
		padding-bottom: 0.5rem;
	}

	.button-group {
		display: flex;
		gap: 1rem;
		margin: 1rem 0;
		flex-wrap: wrap;
	}

	button {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 600;
		transition: all 0.3s ease;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		font-size: 0.9rem;
	}

	.btn-primary {
		background: linear-gradient(135deg, #3498db, #2980b9);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: linear-gradient(135deg, #2980b9, #1f4e79);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
	}

	.btn-secondary {
		background: linear-gradient(135deg, #95a5a6, #7f8c8d);
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background: linear-gradient(135deg, #7f8c8d, #5d6d6e);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(149, 165, 166, 0.4);
	}

	.btn-accent {
		background: linear-gradient(135deg, #e74c3c, #c0392b);
		color: white;
	}

	.btn-accent:hover:not(:disabled) {
		background: linear-gradient(135deg, #c0392b, #a93226);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.results {
		margin-top: 1rem;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 8px;
		border-left: 4px solid #3498db;
	}

	.results p {
		margin: 0.5rem 0;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		margin: 1rem 0;
	}

	.stat-card {
		background: linear-gradient(135deg, #667eea, #764ba2);
		color: white;
		padding: 1.5rem;
		border-radius: 8px;
		text-align: center;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.stat-number {
		font-size: 2rem;
		font-weight: bold;
		margin-bottom: 0.5rem;
	}

	.stat-label {
		font-size: 0.9rem;
		opacity: 0.9;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.notification-display {
		margin-top: 1rem;
		padding: 1rem;
		background: #e8f4fd;
		border: 1px solid #bee5eb;
		border-radius: 8px;
		color: #0c5460;
	}

	.info-section {
		background: linear-gradient(135deg, #2c3e50, #34495e);
		color: white;
	}

	.info-section h2 {
		color: white;
		border-bottom-color: #3498db;
	}

	.info-section p {
		margin: 0.75rem 0;
		opacity: 0.9;
	}

	@media (max-width: 768px) {
		:global(body) {
			padding: 1rem;
		}

		h1 {
			font-size: 2rem;
		}

		.demo-section {
			padding: 1.5rem;
		}

		.button-group {
			flex-direction: column;
		}

		button {
			width: 100%;
		}
	}
</style>
