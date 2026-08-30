<script lang="ts">
  export let accent: string | null = null;
  export let className = "";
  export let ended = false;
</script>

<div
  class="glass-game-shell {className}"
  style={accent ? `--ui-accent: ${accent}` : undefined}
>
  {#if ended}
    <main class="game-end"><slot name="end" /></main>
  {:else}
    <div class="game-run-status"><slot name="run" /></div>
    <div class="game-status"><slot name="status" /></div>
    {#if $$slots.location}<div class="game-location"><slot name="location" /></div>{/if}
    <main class="game-content">
      <section class="game-primary" aria-label="Game actions"><slot /></section>
      <aside class="game-queue"><slot name="queue" /></aside>
      <aside class="game-inventory"><slot name="inventory" /></aside>
      <aside class="game-timeline"><slot name="timeline" /></aside>
    </main>
  {/if}
</div>

<style>
  .glass-game-shell {
    display: flex;
    width: 100%;
    min-height: 100%;
    flex-direction: column;
    gap: 4px;
    margin-inline: auto;
    padding: 8px;
  }

  .game-status {
    display: flex;
    min-width: 0;
    align-items: stretch;
    gap: 8px;
  }

  .game-content {
    display: grid;
    flex: 1;
    min-width: 0;
    min-height: 0;
    grid-template-columns:
      minmax(0, 6fr) minmax(150px, 3fr) minmax(150px, 3fr)
      minmax(190px, 4fr);
    gap: 4px;
  }

  .game-primary,
  .game-queue,
  .game-inventory,
  .game-timeline,
  .game-end {
    min-width: 0;
    min-height: 0;
  }

  .game-end {
    flex: 1;
    overflow: hidden;
  }

  @media (max-width: 760px) {
    .glass-game-shell {
      overflow: auto;
    }

    .game-content {
      grid-template-columns: minmax(0, 1fr);
    }

    .game-queue,
    .game-inventory,
    .game-timeline {
      min-height: 180px;
    }
  }
</style>
