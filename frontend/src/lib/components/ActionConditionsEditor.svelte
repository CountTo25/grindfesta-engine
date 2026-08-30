<script lang="ts">
  import type {
    ActionCondition,
    ActionConditionJoin,
    ActionConditionType,
    ActionDefinition,
  } from "../api/actions";
  import type { FlagDefinition } from "../api/flags";
  import type { ItemDefinition } from "../api/items";
  import type { LocationDefinition } from "../api/locations";
  import type { GameDataSnapshot, JsonValue } from "../gameData";
  import {
    buildConditionOptions,
    defaultCondition,
    targetOptions,
  } from "../actionConditionOptions";
  import ActionConditionRow from "./ActionConditionRow.svelte";
  import GameDataView from "./GameDataView.svelte";
  import GlassButton from "./GlassButton.svelte";
  import SegmentedControl from "./SegmentedControl.svelte";
  import type { GlassOption } from "./types";

  export let conditions: ActionCondition[] = [];
  export let conditionJoin: ActionConditionJoin = "and";
  export let locations: LocationDefinition[] = [];
  export let actions: ActionDefinition[] = [];
  export let items: ItemDefinition[] = [];
  export let flags: FlagDefinition[] = [];
  export let gameData: GameDataSnapshot;
  let pickerIndex: number | null = null;

  $: sources = { locations, actions, items, flags };
  $: conditionOptions = buildConditionOptions(sources);
  const joinOptions: GlassOption[] = [
    { value: "and", label: "All (AND)" },
    { value: "or", label: "Any (OR)" },
  ];
  $: canAddCondition = conditions.length < 32;

  function addCondition() {
    for (const option of conditionOptions) {
      const condition = option.value as ActionConditionType;
      const target = targetOptions(condition, sources).find(
        ({ value }) =>
          !conditions.some((entry) => entry.condition === condition && entry.value === value),
      );
      if (target) {
        conditions = [...conditions, defaultCondition(condition, target.value)];
        return;
      }
    }
    pickerIndex = conditions.length;
    conditions = [...conditions, defaultCondition("custom", "")];
  }

  function replaceCondition(index: number, next: ActionCondition) {
    conditions = conditions.map((entry, currentIndex) =>
      currentIndex === index ? next : entry,
    );
  }

  function removeCondition(index: number) {
    conditions = conditions.filter((_, currentIndex) => currentIndex !== index);
  }

  function chooseField(path: string, value: JsonValue) {
    if (pickerIndex === null) return;
    conditions = conditions.map((entry, index) =>
      index === pickerIndex ? { ...entry, value: path, check: {
        operator: "=",
        value: Array.isArray(value) || (value !== null && typeof value === "object") ? null : value,
      } } : entry);
  }

</script>

<fieldset class="action-conditions">
  <legend class="field-label">Conditions</legend>
  {#if conditions.length > 1}
    <div class="condition-logic">
      <span class="field-label">Match</span>
      <SegmentedControl
        value={conditionJoin}
        options={joinOptions}
        ariaLabel="Join conditions"
        onChange={(value) => (conditionJoin = value as ActionConditionJoin)}
      />
    </div>
  {/if}
  {#each conditions as condition, index (`${condition.condition}-${index}`)}
    <ActionConditionRow {condition} {index} {conditionOptions}
      {locations} {actions} {items} {flags}
      onChange={(next) => replaceCondition(index, next)}
      onRequestCustom={() => (pickerIndex = index)}
      onRemove={() => removeCondition(index)} />
  {/each}
  <GlassButton
    className="condition-add-button"
    disabled={!canAddCondition}
    on:click={addCondition}
  >
    Add condition
  </GlassButton>
</fieldset>
{#if pickerIndex !== null}
  <GameDataView data={gameData} value={conditions[pickerIndex]?.value ?? ""}
    onChoose={chooseField} onClose={() => (pickerIndex = null)} />
{/if}
