<script lang="ts">
  import type { TimelineEntry } from "../game/types";
  import { elapsedTime } from "../game/view";
  import { GlassPanel } from "../ui";

  export let entries: readonly TimelineEntry[] = [];
  $: recentEntries = entries.slice(-12).reverse();
</script>

<GlassPanel title="Timeline" className="game-column-panel">
  <div class="generated-timeline">
    {#each recentEntries as entry, index (`${entry.ts}-${index}`)}
      <article class="glass-card timeline-entry">
        <time>{elapsedTime(entry.ts)}</time>
        <span>{entry.text}</span>
      </article>
    {/each}
  </div>
</GlassPanel>
