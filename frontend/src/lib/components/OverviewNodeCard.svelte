<script lang="ts">
  import type { PositionedOverviewNode } from "../overviewTypes";

  export let node: PositionedOverviewNode;
  export let selected = false;
  export let related = false;
  export let onSelect: (nodeId: string) => void;
</script>

<button
  class="overview-node"
  class:location-node={node.kind === "location"}
  class:action-node={node.kind === "action"}
  class:selected
  class:related
  style={`left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px`}
  aria-pressed={selected}
  on:click|stopPropagation={() => onSelect(node.id)}
>
  <span class="overview-node-heading">
    <span class="overview-node-type">{node.kind}</span>
    {#if node.kind === "action"}
      <span class="overview-node-badge">{node.repeatable ? "Repeat" : "Once"}</span>
    {:else}
      <span class="overview-node-badge">Location</span>
    {/if}
  </span>
  <strong>{node.title}</strong>
  {#if node.subtitle}<span class="overview-node-subtitle">{node.subtitle}</span>{/if}
  {#if node.kind === "action"}
    <span class="overview-node-meta">
      <span>{node.skillName}</span>
      <span>Weight {node.weight}</span>
      {#if node.reveals.length}<span>{node.reveals.length} reveal</span>{/if}
      {#if node.effects.length}<span>{node.effects.length} effect{node.effects.length === 1 ? "" : "s"}</span>{/if}
    </span>
  {/if}
</button>
