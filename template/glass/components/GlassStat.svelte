<script lang="ts">
  import GlassProgress from "./GlassProgress.svelte";

  export let label: string;
  export let value: string | number;
  export let detail = "";
  export let progress: number | null = null;
  export let tone: "accent" | "secondary" | "energy" = "accent";
  export let accent: string | null = null;
</script>

<div
  class="glass-card glass-stat"
  style={accent ? `--ui-accent: ${accent}` : undefined}
>
  <div class="glass-stat-header">
    <span class="glass-stat-label">{label}</span>
    <strong class="glass-stat-value">{value}</strong>
  </div>
  {#if detail}<div class="glass-stat-detail">{detail}</div>{/if}
  {#if progress !== null}
    <div class="glass-stat-progress">
      <GlassProgress percent={progress} {tone} label={`${label} progress`} />
    </div>
  {/if}
</div>

<style>
  .glass-stat {
    min-width: 0;
    padding: 9px 10px 7px;
  }

  .glass-stat-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .glass-stat-label {
    color: var(--ui-text-muted);
    font-size: 0.68rem;
  }

  .glass-stat-value {
    color: var(--ui-accent);
    font: 700 0.82rem/1 var(--ui-font-numeric);
    text-shadow: 0 0 9px rgb(from var(--ui-accent) r g b / 28%);
  }

  .glass-stat-detail {
    margin-top: 3px;
    color: var(--ui-text-subtle);
    font-size: 0.62rem;
  }

  .glass-stat-progress {
    overflow: hidden;
    margin: 7px -8px -5px;
    border-radius: 0 0 9px 9px;
  }
</style>
