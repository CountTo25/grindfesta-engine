<script lang="ts">
  import type { ActionCondition, ActionDefinition } from "../api/actions";
  import type { FlagDefinition } from "../api/flags";
  import type { ItemDefinition } from "../api/items";
  import type { LocationDefinition } from "../api/locations";
  import { defaultCondition, targetOptions } from "../actionConditionOptions";
  import AutocompleteSelect from "./AutocompleteSelect.svelte";
  import CustomConditionFields from "./CustomConditionFields.svelte";
  import GlassButton from "./GlassButton.svelte";
  import GlassSelect from "./GlassSelect.svelte";
  import type { GlassOption } from "./types";

  export let condition: ActionCondition;
  export let index: number;
  export let conditionOptions: GlassOption[];
  export let locations: LocationDefinition[] = [];
  export let actions: ActionDefinition[] = [];
  export let items: ItemDefinition[] = [];
  export let flags: FlagDefinition[] = [];
  export let description: string | undefined = undefined;
  export let onChange: (condition: ActionCondition) => void;
  export let onRemove: () => void;
  export let onDescriptionChange: ((description: string) => void) | undefined = undefined;
  export let onRequestCustom: (() => void) | undefined = undefined;

  $: sources = { locations, actions, items, flags };

  function changeType() {
    const value = targetOptions(condition.condition, sources)[0]?.value ?? "";
    onChange({ ...defaultCondition(condition.condition, value), not: condition.not });
    if (condition.condition === "custom") onRequestCustom?.();
  }

  function notifyChange() {
    onChange({ ...condition });
  }

  function changeAmount(event: Event) {
    const amount = Number((event.currentTarget as HTMLInputElement).value);
    onChange({ ...condition, amount });
  }

  function changeComparison(event: Event) {
    const comparisonValue = (event.currentTarget as HTMLInputElement).value;
    onChange({ ...condition, comparisonValue });
  }

  $: numericFlag = condition.condition === "flagAtLeast" || condition.condition === "flagAtMost";
</script>

<div class="action-condition-row">
  <GlassSelect bind:value={condition.condition} label="Type"
    name={`actionCondition${index}`} options={conditionOptions} on:change={changeType} />
  <GlassButton className="condition-not-button" active={condition.not}
    pressed={condition.not} ariaLabel="Invert condition" title="Invert condition"
    on:click={() => onChange({ ...condition, not: !condition.not })}>NOT</GlassButton>
  {#if condition.condition === "custom"}
    <CustomConditionFields {condition} {index} {onChange}
      onPick={() => onRequestCustom?.()} />
  {:else}
    <AutocompleteSelect bind:value={condition.value} label="Target"
      name={`actionConditionValue${index}`}
      options={targetOptions(condition.condition, sources)} on:change={notifyChange} />
  {/if}
  {#if condition.condition === "hasItem"}
    <label class="field-stack condition-amount">
      <span class="field-label">Amount</span>
      <input class="text-input" type="number" min="1" step="1"
        value={condition.amount ?? 1} on:input={changeAmount} />
    </label>
  {:else if numericFlag}
    <label class="field-stack condition-amount">
      <span class="field-label">Target value</span>
      <input class="text-input" type="number" min="0" max="1000000" step="1"
        value={condition.amount ?? 0} on:input={changeAmount} />
    </label>
  {:else if condition.condition === "flagEquals"}
    <label class="field-stack condition-amount">
      <span class="field-label">Expected value</span>
      <input class="text-input" maxlength="200"
        value={condition.comparisonValue ?? ""} on:input={changeComparison} />
    </label>
  {/if}
  {#if description !== undefined}
    <label class="field-stack reveal-condition-description">
      <span class="field-label">Shown requirement</span>
      <input class="text-input" maxlength="200" value={description}
        on:input={(event) => onDescriptionChange?.(
          (event.currentTarget as HTMLInputElement).value)} />
    </label>
  {/if}
  <GlassButton className="condition-remove-button" iconOnly
    ariaLabel="Remove condition" title="Remove condition" on:click={onRemove}>×</GlassButton>
</div>
