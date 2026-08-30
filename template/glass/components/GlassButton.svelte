<script lang="ts">
  export let type: "button" | "submit" | "reset" = "button";
  export let variant: "default" | "primary" | "danger" = "default";
  export let active = false;
  export let pressed: boolean | undefined = undefined;
  export let disabled = false;
  export let compact = false;
  export let fullWidth = false;
  export let className = "";
  export let title: string | undefined = undefined;
  export let ariaLabel: string | undefined = undefined;
</script>

<button
  class="glass-control {className}"
  {type}
  {disabled}
  {title}
  data-variant={variant}
  data-active={active || undefined}
  data-compact={compact || undefined}
  data-full-width={fullWidth || undefined}
  aria-pressed={pressed}
  aria-label={ariaLabel}
  on:click
>
  <span class="glass-button-content"><slot /></span>
</button>
