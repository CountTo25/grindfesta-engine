<script lang="ts">
  import type { GlassOption } from "./types";
  import type { OverviewConnectionFilter } from "../overviewFilter";
  import GlassButton from "./GlassButton.svelte";
  import GlassSelect from "./GlassSelect.svelte";
  import TextField from "./TextField.svelte";

  export let search = "";
  export let skillId = "";
  export let locationId = "";
  export let connection: OverviewConnectionFilter = "all";
  export let skillOptions: GlassOption[] = [];
  export let locationOptions: GlassOption[] = [];
  export let zoom = 1;
  export let actionCount = 0;
  export let edgeCount = 0;
  export let loading = false;
  export let detailsOpen = true;
  export let onFit: () => void;
  export let onRefresh: () => void;

  const connectionOptions: GlassOption[] = [
    { value: "all", label: "All connections" },
    { value: "requirement", label: "Requirements" },
    { value: "reveal", label: "Reveal checks" },
    { value: "travel", label: "Location changes" },
    { value: "resource", label: "Items and flags" },
    { value: "state", label: "Custom data" },
  ];

  function changeZoom(amount: number) {
    zoom = Math.max(0.65, Math.min(1.6, Math.round((zoom + amount) * 10) / 10));
  }
</script>

<div class="overview-toolbar">
  <div class="overview-filter-fields">
    <TextField label="Search" type="search" bind:value={search} placeholder="Action or dependency" />
    <GlassSelect label="Skill" bind:value={skillId} options={skillOptions} />
    <GlassSelect label="Location" bind:value={locationId} options={locationOptions} />
    <GlassSelect label="Connections" bind:value={connection} options={connectionOptions} />
  </div>
  <div class="overview-toolbar-actions">
    <span class="overview-count">{actionCount} actions · {edgeCount} links</span>
    <div class="overview-zoom-controls" aria-label="Graph zoom">
      <GlassButton iconOnly ariaLabel="Zoom out" title="Zoom out" on:click={() => changeZoom(-0.1)}>−</GlassButton>
      <span>{Math.round(zoom * 100)}%</span>
      <GlassButton iconOnly ariaLabel="Zoom in" title="Zoom in" on:click={() => changeZoom(0.1)}>+</GlassButton>
      <GlassButton on:click={onFit}>Fit</GlassButton>
    </div>
    <GlassButton active={detailsOpen} pressed={detailsOpen} on:click={() => (detailsOpen = !detailsOpen)}>
      Details
    </GlassButton>
    <GlassButton disabled={loading} on:click={onRefresh}>{loading ? "Loading" : "Refresh"}</GlassButton>
  </div>
</div>
