<script lang="ts">
  import type { GlassSurfaceTag, GlassSurfaceVariant } from "./types";

  export let tag: GlassSurfaceTag = "div";
  export let variant: GlassSurfaceVariant = "surface";
  export let className = "";
  export let interactive = false;
  export let occludes: boolean | undefined = undefined;
  export let accent: string | undefined = undefined;
  export let labelledBy: string | undefined = undefined;
  export let ariaLabel: string | undefined = undefined;
  export let role: string | undefined = undefined;
  export let tabindex: number | undefined = undefined;

  $: isOccluder = occludes ?? variant === "menu";
</script>

<svelte:element
  this={tag}
  class={`glass-${variant} ${className}`.trim()}
  class:interactive-glass={interactive}
  data-glass-occluder={isOccluder || undefined}
  style:--ui-accent={accent}
  aria-labelledby={labelledBy}
  aria-label={ariaLabel}
  {role}
  {tabindex}
  on:click
  on:keydown
>
  <slot />
</svelte:element>
