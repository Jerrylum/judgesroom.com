<script lang="ts">
  import { useWRPC } from '../lib/use-wrpc';
  import { onMount } from 'svelte';

  const wrpc = useWRPC();
  
  let name = '';
  let ageResult = '';
  let interests: string[] = [];

  onMount(async () => {
    try {
      // Test query
      const nameResult = await wrpc.getName.query(["Jerry"]);
      name = nameResult as string;
    } catch (error) {
      console.error('Error calling getName:', error);
    }
  });

  async function setAge() {
    try {
      const result = await wrpc.setAge.mutation([20]);
      ageResult = result as string;
    } catch (error) {
      console.error('Error calling setAge:', error);
    }
  }

  $effect(() => {
    const unsubscribe = wrpc.updateInterests.subscribe(['programming'], {
      onData: (data: string[]) => {
        console.log('Received interests:', data);
        interests = data as string[];
      },
      onError: (error: Error) => {
        console.error('Subscription error:', error);
      },
      onComplete: () => {
        console.log('Subscription completed');
      }
    });

    return () => unsubscribe();
  });
</script>

<h1>wRPC Test</h1>
<p>This demonstrates the end-to-end type-safe RPC framework for Cloudflare WebSocket Hibernation API.</p>

<div class="demo-section">
  <h2>Query Test</h2>
  <p>Name from server: <strong>{name || 'Loading...'}</strong></p>
</div>

<div class="demo-section">
  <h2>Mutation Test</h2>
  <button on:click={setAge}>Set Age to 20</button>
  {#if ageResult}
    <p>Result: <strong>{ageResult}</strong></p>
  {/if}
</div>

<div class="demo-section">
  <h2>Subscription Test</h2>
  
  {#if interests.length > 0}
    <p>Current interests:</p>
    <ul>
      {#each interests as interest}
        <li>{interest}</li>
      {/each}
    </ul>
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
