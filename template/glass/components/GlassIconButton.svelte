<script lang="ts">
  export let type: "button" | "submit" | "reset" = "button";
  export let size: "small" | "regular" = "small";
  export let active = false;
  export let pressed: boolean | undefined = undefined;
  export let disabled = false;
  export let badge: string | number | null = null;
  export let className = "";
  export let title: string | undefined = undefined;
  export let ariaLabel: string;
</script>

<button
  class="glass-icon-button {className}"
  {type}
  {disabled}
  {title}
  data-size={size}
  data-active={active || undefined}
  aria-pressed={pressed}
  aria-label={ariaLabel}
  on:click
  on:contextmenu
>
  <span class="glass-icon-content"><slot /></span>
  {#if badge !== null}<span class="glass-icon-badge">{badge}</span>{/if}
</button>
