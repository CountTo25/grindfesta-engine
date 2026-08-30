<script lang="ts">
  import type { GlassButtonVariant } from "./types";

  export let variant: GlassButtonVariant = "transparent";
  export let type: "button" | "submit" | "reset" = "button";
  export let active = false;
  export let pressed: boolean | undefined = undefined;
  export let disabled = false;
  export let iconOnly = false;
  export let ariaLabel: string | undefined = undefined;
  export let title: string | undefined = undefined;
  export let className = "";
</script>

<button
  class={`glass-control ${className}`.trim()}
  class:standalone-control={variant === "standalone"}
  class:primary-control={variant === "primary"}
  class:danger-control={variant === "danger"}
  class:icon-button={iconOnly}
  {type}
  {disabled}
  {title}
  data-active={active || undefined}
  aria-pressed={pressed}
  aria-label={ariaLabel}
  on:click
>
  <slot />
</button>
