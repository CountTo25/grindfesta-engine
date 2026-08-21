<script lang="ts">
  import type { Glass_surface_tag, Glass_surface_variant } from "./types";

  export let tag: Glass_surface_tag = "div";
  export let variant: Glass_surface_variant = "surface";
  export let class_name = "";
  export let interactive = false;
  export let occludes: boolean | undefined = undefined;
  export let accent: string | undefined = undefined;
  export let labelled_by: string | undefined = undefined;
  export let aria_label: string | undefined = undefined;
  export let role: string | undefined = undefined;
  export let tabindex: number | undefined = undefined;

  $: is_occluder = occludes ?? variant === "menu";
</script>

<svelte:element
  this={tag}
  class={`glass_${variant} ${class_name}`.trim()}
  class:interactive_glass={interactive}
  data-glass-occluder={is_occluder || undefined}
  style:--ui_accent={accent}
  aria-labelledby={labelled_by}
  aria-label={aria_label}
  {role}
  {tabindex}
  on:click
  on:keydown
>
  <slot />
</svelte:element>
