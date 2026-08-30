<script lang="ts">
  import type { QueuedAction } from "../engine/actions";
  import type { RuntimeAction } from "../game/types";
  import { GlassPanel } from "../ui";
  import { formatDuration } from "../game/view";

  export let entries: readonly QueuedAction<string>[] = [];
  export let actions: Record<string, RuntimeAction> = {};
  export let estimatedSeconds = 0;
  export let remove: (index: number) => void;
</script>

<GlassPanel
  title="Queue"
  meta={`${entries.length} ${entries.length === 1 ? "item" : "items"} · ~${formatDuration(estimatedSeconds)}`}
  className="game-column-panel"
>
  <div class="generated-queue">
    {#each entries as queuedAction, index (`${queuedAction.id}-${index}`)}
      <button
        type="button"
        class="glass-card queue-entry"
        title="Remove from queue"
        on:click={() => remove(index)}
      >
        <span>{actions[queuedAction.id]?.title ?? queuedAction.id}</span>
        {#if queuedAction.mode === "max"}<small>MAX</small>{/if}
      </button>
    {/each}
  </div>
</GlassPanel>
