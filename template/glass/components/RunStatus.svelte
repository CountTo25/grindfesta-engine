<script lang="ts">
  import GlassProgress from "./GlassProgress.svelte";

  export let elapsed = "00:00";
  export let currentEnergy = 0;
  export let maxEnergy = 0;
  export let drainRate = 0;
  export let remaining = "00:00";
  export let endedElapsed: string | null = null;
  export let energyMode: "text" | "icon" = "text";
  export let energyIcon = "";

  $: energyPercent = maxEnergy > 0 ? (currentEnergy / maxEnergy) * 100 : 0;
</script>

<section class="glass-surface run-status" aria-label="Run status">
  {#if endedElapsed !== null}
    <div class="run-ended">Energy ran out after {endedElapsed}</div>
  {:else}
    <div class="run-status-values">
      <strong>{elapsed}</strong>
      <span class="run-energy">
        <span class="run-energy-mark" aria-hidden="true">
          {#if energyMode === "icon" && energyIcon}
            <i class={energyIcon}></i>
          {:else}
            energy
          {/if}
        </span>
        <strong>{currentEnergy.toFixed(2)} / {maxEnergy.toFixed(2)}</strong>
        <small>(-{drainRate.toFixed(2)}/s, {remaining} remaining)</small>
      </span>
    </div>
    <div class="run-energy-progress">
      <GlassProgress percent={energyPercent} tone="energy" label="Energy" />
    </div>
  {/if}
</section>

<style>
  .run-status {
    min-height: 62px;
    text-align: center;
  }

  .run-status-values {
    display: grid;
    place-items: center;
    gap: 3px;
    padding: 8px 12px 7px;
    font: 700 0.76rem/1.2 var(--ui-font-numeric);
  }

  .run-energy {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 6px;
  }

  .run-energy small {
    color: var(--ui-text-muted);
    font-size: 0.65rem;
    font-weight: 450;
  }

  .run-energy-mark {
    color: var(--ui-accent);
    font-family: var(--ui-font-body);
    font-size: 0.68rem;
    font-weight: 700;
  }

  .run-energy-progress {
    overflow: hidden;
    margin: 0 2px 2px;
    border-radius: 0 0 calc(var(--ui-radius-panel) - 3px)
      calc(var(--ui-radius-panel) - 3px);
  }

  .run-ended {
    padding: 20px 12px;
    color: var(--ui-text-muted);
    font-size: 0.76rem;
  }

  @media (max-width: 760px) {
    .run-energy {
      flex-wrap: wrap;
    }
  }
</style>
