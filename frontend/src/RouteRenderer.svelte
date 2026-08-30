<script lang="ts">
  import type { Component } from "svelte";

  export let routingSettings: Record<string, Component> = {};
  export let currentRoute: string | null = null;

  let RouteComponent: Component | undefined;
  $: RouteComponent = currentRoute ? routingSettings[currentRoute] : undefined;
</script>

{#if RouteComponent}
  <RouteComponent />
{:else}
  <slot />
{/if}
