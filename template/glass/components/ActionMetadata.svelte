<script lang="ts">
  export let title: string;
  export let skill: string;
  export let runModifier: number;
  export let persistentModifier: number;
  export let totalModifier: number;
  export let baseDuration: number;
  export let duration: number;
  export let progress: number;
  export let weight: number;
  export let queuedCount = 0;
  export let note = "";
  export let traits: Array<{ icon: string; label: string }> = [];
  export let actionId: string;

  const modifier = (value: number) => `×${value.toFixed(2)}`;
  const seconds = (value: number) => `${value.toFixed(2)}s`;
</script>

<div class="action-metadata">
  <header class="action-metadata-header">
    <strong>{title}</strong>
    <span class="action-metadata-skill">{skill}</span>
  </header>

  <div class="action-metadata-breakdown">
    <div class="action-metadata-row">
      <span class="action-metadata-label">Run modifier</span>
      <span class="action-metadata-value">{modifier(runModifier)}</span>
    </div>
    <div class="action-metadata-row">
      <span class="action-metadata-label">Persistent modifier</span>
      <span class="action-metadata-value">{modifier(persistentModifier)}</span>
    </div>
    <div class="action-metadata-row action-metadata-total">
      <span>Total modifier</span>
      <span class="action-metadata-value">
        {runModifier.toFixed(2)} × {persistentModifier.toFixed(2)} = {modifier(totalModifier)}
      </span>
    </div>
  </div>

  <div class="action-metadata-formula">
    {seconds(baseDuration)} base ÷ {modifier(totalModifier)} = {seconds(duration)}
  </div>
  <div class="action-metadata-row">
    <span>{progress.toFixed(2)} / {weight.toFixed(2)} progress</span>
    {#if queuedCount > 0}<span>Queued {queuedCount}×</span>{/if}
  </div>

  {#if note}<div class="action-metadata-note">{note}</div>{/if}
  {#if traits.length > 0}
    <div class="action-metadata-traits">
      {#each traits as trait}
        <div class="action-metadata-trait">
          <span class="action-metadata-trait-icon" aria-hidden="true">{trait.icon}</span>
          <span>{trait.label}</span>
        </div>
      {/each}
    </div>
  {/if}
  <div class="action-metadata-id">ID: #{actionId}</div>
</div>
