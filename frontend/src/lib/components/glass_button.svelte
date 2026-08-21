<script lang="ts">
  import type { Glass_button_variant } from "./types";

  export let variant: Glass_button_variant = "transparent";
  export let type: "button" | "submit" | "reset" = "button";
  export let active = false;
  export let pressed: boolean | undefined = undefined;
  export let disabled = false;
  export let icon_only = false;
  export let aria_label: string | undefined = undefined;
  export let title: string | undefined = undefined;
  export let class_name = "";
</script>

<button
  class={`glass_control ${class_name}`.trim()}
  class:standalone_control={variant === "standalone"}
  class:primary_control={variant === "primary"}
  class:danger_control={variant === "danger"}
  class:icon_button={icon_only}
  {type}
  {disabled}
  {title}
  data-active={active || undefined}
  aria-pressed={pressed}
  aria-label={aria_label}
  on:click
>
  <slot />
</button>
