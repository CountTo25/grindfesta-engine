<script lang="ts">
  import type { Glass_option } from "./types";

  export let label: string;
  export let value = "";
  export let options: Glass_option[] = [];
  export let name: string | undefined = undefined;
  export let disabled = false;
</script>

<label class="field_stack">
  <span class="field_label">{label}</span>
  <select class="glass_select" bind:value {name} {disabled} on:change>
    {#each options as option (option.value)}
      <option value={option.value} disabled={option.disabled}>{option.label}</option>
    {/each}
  </select>
</label>
