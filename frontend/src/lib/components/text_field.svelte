<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";

  export let label: string;
  export let value = "";
  export let name: string | undefined = undefined;
  export let type: "text" | "email" | "password" | "search" = "text";
  export let placeholder = "";
  export let disabled = false;
  export let autocomplete: HTMLInputAttributes["autocomplete"] = undefined;
</script>

<label class="field_stack">
  <span class="field_label">{label}</span>
  <input
    class="text_input"
    bind:value
    {name}
    {type}
    {placeholder}
    {disabled}
    {autocomplete}
    on:input
    on:change
  />
</label>
