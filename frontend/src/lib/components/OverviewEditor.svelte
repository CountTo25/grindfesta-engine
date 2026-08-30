<script lang="ts">
  import { onMount, tick } from "svelte";
  import { listActions } from "../api/actions";
  import { listFlags } from "../api/flags";
  import { listItems } from "../api/items";
  import { listLocations } from "../api/locations";
  import { listSkills } from "../api/skills";
  import { filterOverview, type OverviewConnectionFilter } from "../overviewFilter";
  import { buildOverviewGraph } from "../overviewGraph";
  import type { OverviewGraph } from "../overviewTypes";
  import OverviewDetails from "./OverviewDetails.svelte";
  import OverviewMap from "./OverviewMap.svelte";
  import OverviewToolbar from "./OverviewToolbar.svelte";

  export let projectUuid: string;

  let graph: OverviewGraph = { nodes: [], edges: [], warnings: [] };
  let loading = true;
  let error = "";
  let search = "";
  let skillId = "";
  let locationId = "";
  let connection: OverviewConnectionFilter = "all";
  let selectedId: string | null = null;
  let zoom = 1;
  let detailsOpen = true;
  let map: OverviewMap;

  $: skillOptions = [
    { value: "", label: "All skills" },
    ...graph.nodes.filter((node) => node.kind === "action" && node.skillId)
      .filter((node, index, values) => values.findIndex((item) => item.skillId === node.skillId) === index)
      .map((node) => ({ value: node.skillId ?? "", label: node.skillName ?? "Unknown skill" })),
  ];
  $: locationOptions = [
    { value: "", label: "All locations" },
    ...graph.nodes.filter((node) => node.kind === "location")
      .map((node) => ({ value: node.entityUuid, label: node.title })),
  ];
  $: filtered = filterOverview(graph.nodes, graph.edges, {
    search, skillId, locationId, connection,
  });
  $: selectedNode = graph.nodes.find((node) => node.id === selectedId) ?? null;

  onMount(loadGraph);

  async function loadGraph() {
    loading = true;
    error = "";
    try {
      const [actions, flags, items, locations, skills] = await Promise.all([
        listActions(projectUuid), listFlags(projectUuid), listItems(projectUuid),
        listLocations(projectUuid), listSkills(projectUuid),
      ]);
      graph = buildOverviewGraph({ actions, flags, items, locations, skills });
      selectedId = null;
      await tick();
      map?.fitAll();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Could not load project flow.";
    } finally {
      loading = false;
    }
  }
</script>

<section class="overview-editor" aria-label="Project flow overview">
  <OverviewToolbar
    bind:search bind:skillId bind:locationId bind:connection bind:zoom bind:detailsOpen
    {skillOptions} {locationOptions} {loading}
    actionCount={filtered.actionCount}
    edgeCount={filtered.edges.length}
    onFit={() => map?.fitAll()}
    onRefresh={loadGraph}
  />
  {#if error}
    <div class="overview-error" role="alert">{error}</div>
  {:else}
    <div class="overview-workspace" class:details-hidden={!detailsOpen}>
      <OverviewMap
        bind:this={map} bind:zoom
        nodes={filtered.nodes} edges={filtered.edges} {selectedId}
        onSelect={(nodeId) => (selectedId = nodeId)}
      />
      {#if detailsOpen}
        <OverviewDetails
          node={selectedNode} nodes={graph.nodes} edges={graph.edges} warnings={graph.warnings}
          onSelect={(nodeId) => (selectedId = nodeId)}
        />
      {/if}
    </div>
  {/if}
  <footer class="overview-legend" aria-label="Connection legend">
    <span class="requirement">Requirement</span><span class="reveal">Reveal</span>
    <span class="travel">Location change</span><span class="resource">Item or flag</span>
    <span class="state">Custom data</span>
    {#if graph.warnings.length}<strong>{graph.warnings.length} flow warning{graph.warnings.length === 1 ? "" : "s"}</strong>{/if}
  </footer>
</section>
