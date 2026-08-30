<script lang="ts">
  import type { GlassOption } from "./types";

  export let label: string;
  export let value = "";
  export let options: GlassOption[] = [];
  export let name: string | undefined = undefined;
  export let disabled = false;
</script>

<label class="field-stack">
  <span class="field-label">{label}</span>
  <select class="glass-select" bind:value {name} {disabled} on:change>
    {#each options as option (option.value)}
      <option value={option.value} disabled={option.disabled}>{option.label}</option>
    {/each}
  </select>
</label>
