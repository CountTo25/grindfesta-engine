<script lang="ts">
  import type { OverviewEdge, OverviewNode } from "../overviewTypes";
  import OverviewRuleList from "./OverviewRuleList.svelte";

  export let node: OverviewNode | null = null;
  export let edges: OverviewEdge[] = [];
  export let nodes: OverviewNode[] = [];
  export let warnings: string[] = [];
  export let onSelect: (nodeId: string) => void;

  $: nodeNames = new Map(nodes.map((item) => [item.id, item.title]));
  $: connections = node
    ? edges.filter((edge) => edge.from === node?.id || edge.to === node?.id) : [];

  function otherNode(edge: OverviewEdge) {
    return edge.from === node?.id ? edge.to : edge.from;
  }

  function direction(edge: OverviewEdge) {
    return edge.from === node?.id ? "Leads to" : "Comes from";
  }
</script>

<aside class="overview-details" aria-label="Overview details">
  {#if node}
    <header class="overview-details-heading">
      <span>{node.kind}</span>
      <h2>{node.title}</h2>
      {#if node.subtitle}<p>{node.subtitle}</p>{/if}
    </header>
    {#if node.kind === "action"}
      <div class="overview-facts">
        <span><small>Skill</small>{node.skillName}</span>
        <span><small>Weight</small>{node.weight}</span>
        <span><small>Mode</small>{node.repeatable ? "Repeatable" : "Once"}</span>
      </div>
    {/if}
    <OverviewRuleList title="Requirements" rules={node.requirements} join={node.conditionJoin} />
    <OverviewRuleList title="Reveal" rules={node.reveals} join="and" />
    <OverviewRuleList title="On completion" rules={node.effects} />
    <section class="overview-connection-section">
      <header><span>Connections</span><small>{connections.length}</small></header>
      {#if connections.length}
        <div class="overview-connection-list">
          {#each connections as edge (edge.id)}
            <button on:click={() => onSelect(otherNode(edge))}>
              <span class={`overview-connection-kind ${edge.kind}`}>{edge.kind}</span>
              <strong>{nodeNames.get(otherNode(edge)) ?? "Missing reference"}</strong>
              <small>{direction(edge)} · {edge.label}</small>
            </button>
          {/each}
        </div>
      {:else}
        <p class="overview-details-empty">No graph connections.</p>
      {/if}
    </section>
  {:else}
    <div class="overview-details-placeholder">
      <h2>Flow details</h2>
      <p>Select an action or location to inspect what it requires and where it leads.</p>
    </div>
    {#if warnings.length}
      <section class="overview-warning-section">
        <header><span>Flow warnings</span><small>{warnings.length}</small></header>
        <ul>{#each warnings as warning}<li>{warning}</li>{/each}</ul>
      </section>
    {/if}
  {/if}
</aside>
