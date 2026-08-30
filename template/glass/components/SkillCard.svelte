<script lang="ts">
  import GlassProgress from "./GlassProgress.svelte";

  export let name: string;
  export let icon = "";
  export let modifier = 1;
  export let runLevel = 1;
  export let persistentLevel = 1;
  export let runModifier = 1;
  export let persistentModifier = 1;
  export let runProgress = 0;
  export let persistentProgress = 0;
</script>

<div class="skill-card-shell">
  <article class="glass-card skill-card" tabindex="0" aria-label={`${name} skill`}>
    <div class="skill-card-header">
      <span class="skill-card-icon" aria-hidden="true">
        {#if icon}<i class={icon}></i>{:else}◆{/if}
      </span>
      <strong>{name}</strong>
      <span class="skill-card-modifier">×{modifier.toFixed(2)}</span>
    </div>
    <div class="skill-progress-stack">
      <GlassProgress percent={runProgress} label={`${name} run progress`} />
      <GlassProgress
        percent={persistentProgress}
        tone="secondary"
        label={`${name} persistent progress`}
      />
    </div>
  </article>
  <aside class="glass-menu skill-card-details" role="tooltip">
    <div><strong>Run level {runLevel}</strong><span>×{runModifier.toFixed(2)}</span></div>
    <div>
      <strong>Persistent level {persistentLevel}</strong>
      <span>×{persistentModifier.toFixed(2)}</span>
    </div>
  </aside>
</div>
