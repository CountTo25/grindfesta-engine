<script lang="ts">
  import GlassButton from "./GlassButton.svelte";
  import type { GlassOption } from "./types";

  export let value = "";
  export let options: GlassOption[] = [];
  export let ariaLabel: string;
  export let onChange: (value: string) => void = () => {};

  function selectOption(nextValue: string) {
    value = nextValue;
    onChange(nextValue);
  }
</script>

<div class="segmented-control" role="group" aria-label={ariaLabel}>
  {#each options as option (option.value)}
    <GlassButton
      active={option.value === value}
      pressed={option.value === value}
      disabled={option.disabled}
      on:click={() => selectOption(option.value)}
    >
      <span class="segmented-option">
        <span>{option.label}</span>
        {#if option.description}
          <small>{option.description}</small>
        {/if}
      </span>
    </GlassButton>
  {/each}
</div>
