<script lang="ts">
  import type { Component } from "svelte";

  export let routing_settings: Record<string, Component> = {};
  export let current_route: string | null = null;

  let Route_component: Component | undefined;
  $: Route_component = current_route ? routing_settings[current_route] : undefined;
</script>

{#if Route_component}
  <Route_component />
{:else}
  <slot />
{/if}
