<script lang="ts">
  import GlassButton from "./GlassButton.svelte";
  import GlassIconButton from "./GlassIconButton.svelte";

  export let mode: "text" | "icon" = "text";
  export let icon = "";
  export let label: string;
  export let active = false;
  export let disabled = false;
  export let badge: number | null = null;
  export let title = label;
</script>

{#if mode === "icon" && icon}
  <GlassIconButton
    className="action-command-control"
    ariaLabel={label}
    {active}
    pressed={active}
    {disabled}
    {badge}
    {title}
    on:click
    on:contextmenu
  >
    <i class={icon} aria-hidden="true"></i>
  </GlassIconButton>
{:else}
  <GlassButton
    className="action-command-control"
    compact
    {active}
    pressed={active}
    {disabled}
    {title}
    on:click
  >
    {label}{#if badge !== null}<span class="action-control-count">{badge}</span>{/if}
  </GlassButton>
{/if}

<style>
  .action-control-count {
    display: inline-grid;
    min-width: 15px;
    height: 15px;
    place-items: center;
    padding-inline: 3px;
    border-radius: 999px;
    background: rgb(from var(--ui-accent) r g b / 18%);
    color: var(--ui-accent);
    font-size: 9px;
  }
</style>
