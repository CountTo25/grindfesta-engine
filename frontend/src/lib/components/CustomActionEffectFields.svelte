<script lang="ts">
  import type { ActionEffect, ActionNumberOperation } from "../api/actions";
  import GameDataField from "./GameDataField.svelte";
  import GlassSelect from "./GlassSelect.svelte";

  export let effect: ActionEffect;
  export let index: number;
  export let onChange: (effect: ActionEffect) => void;
  export let onPick: () => void;

  let operation = "add";
  $: operation = effect.operation ?? "add";

  function changeOperation() {
    onChange({ ...effect, operation: operation as ActionNumberOperation });
  }

  function changeOperand(event: Event) {
    const operand = Number((event.currentTarget as HTMLInputElement).value);
    onChange({ ...effect, operand });
  }
</script>

<GameDataField value={effect.value} onPick={onPick} />
<GlassSelect bind:value={operation} label="Operation" name={`customEffectOperation${index}`}
  options={[{ value: "add", label: "Add" }, { value: "subtract", label: "Subtract" }]}
  on:change={changeOperation} />
<label class="field-stack">
  <span class="field-label">Amount</span>
  <input class="text-input" type="number" min="0" step="any"
    value={effect.operand ?? 1} on:input={changeOperand} />
</label>
