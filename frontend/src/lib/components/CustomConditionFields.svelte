<script lang="ts">
  import type {
    ActionComparisonOperator,
    ActionCondition,
  } from "../api/actions";
  import GameDataField from "./GameDataField.svelte";
  import GlassSelect from "./GlassSelect.svelte";
  import type { GlassOption } from "./types";

  export let condition: ActionCondition;
  export let index: number;
  export let onChange: (condition: ActionCondition) => void;
  export let onPick: () => void;

  const allOperators: GlassOption[] = [
    { value: "=", label: "=" },
    { value: "<=", label: "<=" },
    { value: ">=", label: ">=" },
  ];
  const equalityOnly: GlassOption[] = [{ value: "=", label: "=" }];
  let operator = "=";
  let booleanValue = "false";

  $: comparisonValue = condition.check?.value ?? "";
  $: orderedValue = typeof comparisonValue === "number" ||
    typeof comparisonValue === "string";
  $: operatorOptions = orderedValue ? allOperators : equalityOnly;
  $: operator = condition.check?.operator ?? "=";
  $: booleanValue = String(comparisonValue === true);

  function changeOperator() {
    onChange({
      ...condition,
      check: {
        operator: operator as ActionComparisonOperator,
        value: comparisonValue,
      },
    });
  }

  function changeValue(value: string | number | boolean) {
    onChange({
      ...condition,
      check: { operator: condition.check?.operator ?? "=", value },
    });
  }
</script>

<GameDataField value={condition.value} onPick={onPick} />
<GlassSelect bind:value={operator} label="Check" name={`customCheck${index}`}
  options={operatorOptions} on:change={changeOperator} />
{#if comparisonValue === null}
  <label class="field-stack condition-amount">
    <span class="field-label">Expected value</span>
    <input class="text-input" value="null" disabled />
  </label>
{:else if typeof comparisonValue === "boolean"}
  <GlassSelect bind:value={booleanValue} label="Expected value"
    name={`customExpected${index}`}
    options={[{ value: "true", label: "true" }, { value: "false", label: "false" }]}
    on:change={() => changeValue(booleanValue === "true")} />
{:else if typeof comparisonValue === "number"}
  <label class="field-stack condition-amount">
    <span class="field-label">Expected value</span>
    <input class="text-input" type="number" step="any" value={comparisonValue}
      on:input={(event) => changeValue(Number((event.currentTarget as HTMLInputElement).value))} />
  </label>
{:else}
  <label class="field-stack condition-amount">
    <span class="field-label">Expected value</span>
    <input class="text-input" maxlength="500" value={comparisonValue}
      on:input={(event) => changeValue((event.currentTarget as HTMLInputElement).value)} />
  </label>
{/if}
