<script lang="ts">
  import type { EngineVariableDefinition } from "../engineVariableDefinitions";

  export let definition: EngineVariableDefinition;
  export let value: string;
  export let onChange: (value: string) => void;
</script>

<label class="engine-variable-field">
  <span class="engine-variable-copy">
    <strong>{definition.name}</strong>
    <small>{definition.flavour}</small>
  </span>
  <input
    class="text-input"
    type="number"
    min={definition.min}
    max={definition.max}
    step={definition.step}
    {value}
    on:input={(event) => onChange((event.currentTarget as HTMLInputElement).value)}
  />
</label>
