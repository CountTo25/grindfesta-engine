<script lang="ts">
  export let tag: "div" | "article" | "section" | "li" = "div";
  export let className = "";
  export let accent: string | null = null;
  export let interactive = false;
  export let ariaLabel: string | undefined = undefined;
  export let role: string | undefined = undefined;
  export let tabindex: number | undefined = undefined;
</script>

<svelte:element
  this={tag}
  class="glass-card {className}"
  class:interactive-glass={interactive}
  style={accent ? `--ui-accent: ${accent}` : undefined}
  aria-label={ariaLabel}
  {role}
  {tabindex}
  on:click
  on:keydown
>
  <slot />
</svelte:element>
