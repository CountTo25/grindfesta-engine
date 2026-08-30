<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";

  export let label: string;
  export let value = "";
  export let name: string | undefined = undefined;
  export let type: "text" | "email" | "number" | "password" | "search" = "text";
  export let placeholder = "";
  export let disabled = false;
  export let required = false;
  export let maxlength: number | undefined = undefined;
  export let min: HTMLInputAttributes["min"] = undefined;
  export let max: HTMLInputAttributes["max"] = undefined;
  export let step: HTMLInputAttributes["step"] = undefined;
  export let autocomplete: HTMLInputAttributes["autocomplete"] = undefined;
  export let inputElement: HTMLInputElement | undefined = undefined;
</script>

<label class="field-stack">
  <span class="field-label">{label}</span>
  <input
    bind:this={inputElement}
    class="text-input"
    bind:value
    {name}
    {type}
    {placeholder}
    {disabled}
    {required}
    {maxlength}
    {min}
    {max}
    {step}
    {autocomplete}
    on:input
    on:change
  />
</label>
