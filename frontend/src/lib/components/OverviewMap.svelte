<script lang="ts">
  import { layoutOverview, overviewEdgePath } from "../overviewLayout";
  import type { OverviewEdge, OverviewNode } from "../overviewTypes";
  import OverviewNodeCard from "./OverviewNodeCard.svelte";

  export let nodes: OverviewNode[] = [];
  export let edges: OverviewEdge[] = [];
  export let selectedId: string | null = null;
  export let zoom = 1;
  export let onSelect: (nodeId: string | null) => void;

  let viewport: HTMLDivElement;
  $: layout = layoutOverview(nodes);
  $: positioned = new Map(layout.nodes.map((node) => [node.id, node]));
  $: selectedEdges = selectedId
    ? edges.filter((edge) => edge.from === selectedId || edge.to === selectedId) : [];
  $: selectedEdgeIds = new Set(selectedEdges.map((edge) => edge.id));
  $: relatedIds = new Set(selectedEdges.flatMap((edge) => [edge.from, edge.to]));

  export function fitAll() {
    if (!viewport || layout.width <= 0 || layout.height <= 0) return;
    zoom = Math.max(0.65, Math.min(1.2,
      Math.min((viewport.clientWidth - 36) / layout.width, (viewport.clientHeight - 36) / layout.height)));
    requestAnimationFrame(() => {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    });
  }
</script>

<div class="overview-map" bind:this={viewport} on:click={() => onSelect(null)}>
  {#if nodes.length}
    <div class="overview-stage" style={`width:${layout.width * zoom}px;height:${layout.height * zoom}px`}>
      <div
        class="overview-scene"
        style={`width:${layout.width}px;height:${layout.height}px;transform:scale(${zoom})`}
      >
        <svg class="overview-edges" width={layout.width} height={layout.height} aria-hidden="true">
          <defs>
            {#each ["requirement", "reveal", "travel", "resource", "state"] as kind}
              <marker id={`overview-arrow-${kind}`} viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" class={`overview-marker ${kind}`} />
              </marker>
            {/each}
          </defs>
          {#each edges as edge (edge.id)}
            {@const source = positioned.get(edge.from)}
            {@const target = positioned.get(edge.to)}
            {#if source && target}
              <path
                d={overviewEdgePath(source, target)}
                class={`overview-edge ${edge.kind}`}
                class:selected={selectedEdgeIds.has(edge.id)}
                class:muted={Boolean(selectedId) && !selectedEdgeIds.has(edge.id)}
                class:negated={edge.negated}
                marker-end={`url(#overview-arrow-${edge.kind})`}
              ><title>{edge.label}</title></path>
            {/if}
          {/each}
        </svg>
        {#each layout.groups as group (group.id)}
          <div class="overview-group-label" style={`left:${group.x}px`}>
            <span>{group.title}</span><small>{group.count} action{group.count === 1 ? "" : "s"}</small>
          </div>
        {/each}
        {#each layout.nodes as node (node.id)}
          <OverviewNodeCard
            {node}
            selected={node.id === selectedId}
            related={relatedIds.has(node.id) && node.id !== selectedId}
            onSelect={(nodeId) => onSelect(nodeId)}
          />
        {/each}
      </div>
    </div>
  {:else}
    <div class="overview-empty">No actions or locations match these filters.</div>
  {/if}
</div>
