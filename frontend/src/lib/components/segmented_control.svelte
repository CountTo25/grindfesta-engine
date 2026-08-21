<script lang="ts">
  import Glass_button from "./glass_button.svelte";
  import type { Glass_option } from "./types";

  export let value = "";
  export let options: Glass_option[] = [];
  export let aria_label: string;
</script>

<div class="segmented_control" role="group" aria-label={aria_label}>
  {#each options as option (option.value)}
    <Glass_button
      active={option.value === value}
      pressed={option.value === value}
      disabled={option.disabled}
      on:click={() => (value = option.value)}
    >
      {option.label}
    </Glass_button>
  {/each}
</div>
