<script lang="ts">
  import type {
    ActionCondition,
    ActionConditionType,
    ActionDefinition,
    ActionRevealCondition,
  } from "../api/actions";
  import type { FlagDefinition } from "../api/flags";
  import type { ItemDefinition } from "../api/items";
  import type { LocationDefinition } from "../api/locations";
  import type { GameDataSnapshot, JsonValue } from "../gameData";
  import { buildConditionOptions, defaultCondition, targetOptions } from "../actionConditionOptions";
  import ActionConditionRow from "./ActionConditionRow.svelte";
  import GameDataView from "./GameDataView.svelte";
  import GlassButton from "./GlassButton.svelte";

  export let revealConditions: ActionRevealCondition[] = [];
  export let locations: LocationDefinition[] = [];
  export let actions: ActionDefinition[] = [];
  export let items: ItemDefinition[] = [];
  export let flags: FlagDefinition[] = [];
  export let gameData: GameDataSnapshot;
  let pickerIndex: number | null = null;

  $: sources = { locations, actions, items, flags };
  $: conditionOptions = buildConditionOptions(sources);
  $: canAddReveal = revealConditions.length < 32;

  function addReveal() {
    for (const option of conditionOptions) {
      const condition = option.value as ActionConditionType;
      const target = targetOptions(condition, sources).find(({ value }) =>
        !revealConditions.some((entry) =>
          entry.condition === condition && entry.value === value));
      if (!target) continue;
      revealConditions = [
        ...revealConditions,
        { ...defaultCondition(condition, target.value), description: "" },
      ];
      return;
    }
    pickerIndex = revealConditions.length;
    revealConditions = [
      ...revealConditions,
      { ...defaultCondition("custom", ""), description: "" },
    ];
  }

  function replaceCondition(index: number, condition: ActionCondition) {
    revealConditions = revealConditions.map((entry, currentIndex) =>
      currentIndex === index ? { ...condition, description: entry.description } : entry);
  }

  function replaceDescription(index: number, description: string) {
    revealConditions = revealConditions.map((entry, currentIndex) =>
      currentIndex === index ? { ...entry, description } : entry);
  }

  function removeReveal(index: number) {
    revealConditions = revealConditions.filter((_, currentIndex) => currentIndex !== index);
  }

  function chooseField(path: string, value: JsonValue) {
    if (pickerIndex === null) return;
    revealConditions = revealConditions.map((entry, index) =>
      index === pickerIndex ? { ...entry, value: path, check: {
        operator: "=",
        value: Array.isArray(value) || (value !== null && typeof value === "object") ? null : value,
      } } : entry);
  }
</script>

<fieldset class="action-conditions action-reveals">
  <legend class="field-label">Reveal</legend>
  {#each revealConditions as reveal, index (`${reveal.condition}-${index}`)}
    <ActionConditionRow condition={reveal} {index} {conditionOptions}
      {locations} {actions} {items} {flags} description={reveal.description}
      onChange={(condition) => replaceCondition(index, condition)}
      onRequestCustom={() => (pickerIndex = index)}
      onDescriptionChange={(description) => replaceDescription(index, description)}
      onRemove={() => removeReveal(index)} />
  {/each}
  <GlassButton className="condition-add-button" disabled={!canAddReveal} on:click={addReveal}>
    Add reveal rule
  </GlassButton>
</fieldset>
{#if pickerIndex !== null}
  <GameDataView data={gameData} value={revealConditions[pickerIndex]?.value ?? ""}
    onChoose={chooseField} onClose={() => (pickerIndex = null)} />
{/if}
