<script lang="ts">
  export let label: string;
  export let value = "";
  export let name: string | undefined = undefined;
  export let placeholder = "";
  export let disabled = false;
  export let required = false;
  export let maxlength: number | undefined = undefined;
  export let rows = 4;
</script>

<label class="field-stack">
  <span class="field-label">{label}</span>
  <textarea
    class="text-input text-area"
    bind:value
    {name}
    {placeholder}
    {disabled}
    {required}
    {maxlength}
    {rows}
    on:input
    on:change
  ></textarea>
</label>
