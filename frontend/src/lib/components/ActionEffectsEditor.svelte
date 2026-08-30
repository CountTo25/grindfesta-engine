<script lang="ts">
  import type { ActionEffect } from "../api/actions";
  import type { FlagDefinition } from "../api/flags";
  import type { ItemDefinition } from "../api/items";
  import type { LocationDefinition } from "../api/locations";
  import type { GameDataSnapshot, JsonValue } from "../gameData";
  import {
    buildEffectOptions,
    effectValueLabel,
    flagFields,
    flagOptions,
    isFlagEffect,
    isItemEffect,
    isLocationEffect,
  } from "../actionEffectOptions";
  import AutocompleteSelect from "./AutocompleteSelect.svelte";
  import CustomActionEffectFields from "./CustomActionEffectFields.svelte";
  import GameDataView from "./GameDataView.svelte";
  import GlassButton from "./GlassButton.svelte";
  import GlassSelect from "./GlassSelect.svelte";
  import TextField from "./TextField.svelte";

  export let effects: ActionEffect[] = [];
  export let items: ItemDefinition[] = [];
  export let flags: FlagDefinition[] = [];
  export let locations: LocationDefinition[] = [];
  export let gameData: GameDataSnapshot;
  let pickerIndex: number | null = null;

  $: effectOptions = buildEffectOptions(items, flags, locations);

  function addEffect() {
    effects = [...effects, { effect: "addLog", value: "" }];
  }

  function removeEffect(index: number) {
    effects = effects.filter((_, candidate) => candidate !== index);
  }

  function changeEffect(index: number) {
    effects = effects.map((entry, candidate) => candidate === index ? {
      ...entry,
      value: isItemEffect(entry.effect) ? (items[0]?.uuid ?? "")
        : isFlagEffect(entry.effect) ? (flagOptions(entry.effect, flags)[0]?.value ?? "")
        : isLocationEffect(entry.effect) ? (locations[0]?.uuid ?? "") : "",
      ...(isItemEffect(entry.effect) ? { amount: 1, flagValue: undefined }
        : isFlagEffect(entry.effect)
          ? flagFields(entry.effect, flagOptions(entry.effect, flags)[0]?.value ?? "", flags)
          : { amount: undefined, flagValue: undefined }),
      operation: entry.effect === "custom" ? "add" : undefined,
      operand: entry.effect === "custom" ? 1 : undefined,
    } : entry);
    if (effects[index]?.effect === "custom") pickerIndex = index;
  }

  function changeFlag(index: number) {
    effects = effects.map((entry, candidate) => candidate === index
      ? { ...entry, ...flagFields(entry.effect, entry.value, flags) } : entry);
  }

  function changeFlagValue(index: number, event: Event) {
    const flagValue = (event.currentTarget as HTMLInputElement).value;
    effects = effects.map((entry, candidate) =>
      candidate === index ? { ...entry, flagValue } : entry);
  }

  function changeAmount(index: number, event: Event) {
    const amount = Number((event.currentTarget as HTMLInputElement).value);
    effects = effects.map((entry, candidate) =>
      candidate === index ? { ...entry, amount } : entry,
    );
  }

  function replaceEffect(index: number, effect: ActionEffect) {
    effects = effects.map((entry, candidate) => candidate === index ? effect : entry);
  }

  function chooseField(path: string, value: JsonValue) {
    if (pickerIndex === null || typeof value !== "number") return;
    effects = effects.map((entry, index) =>
      index === pickerIndex ? {
        ...entry,
        value: path,
        operation: entry.operation ?? "add",
        operand: entry.operand ?? 1,
      } : entry);
  }
</script>

<fieldset class="action-effects">
  <legend class="field-label">On completion</legend>
  {#each effects as effect, index (`${index}-${effect.effect}`)}
    <div class="action-effect-row">
      <GlassSelect
        bind:value={effect.effect}
        label="Effect"
        name={`actionEffect${index}`}
        options={effectOptions}
        on:change={() => changeEffect(index)}
      />
      {#if effect.effect === "custom"}
        <CustomActionEffectFields {effect} {index}
          onChange={(next) => replaceEffect(index, next)}
          onPick={() => (pickerIndex = index)} />
      {:else if isItemEffect(effect.effect)}
        <GlassSelect
          bind:value={effect.value}
          label="Item"
          name={`actionEffectItem${index}`}
          options={items.map((item) => ({ value: item.uuid, label: item.name }))}
        />
        <label class="field-stack">
          <span class="field-label">Amount</span>
          <input
            class="text-input"
            type="number"
            min="1"
            step="1"
            value={effect.amount ?? 1}
            on:input={(event) => changeAmount(index, event)}
          />
        </label>
      {:else if isLocationEffect(effect.effect)}
        <AutocompleteSelect
          bind:value={effect.value}
          label="Location"
          name={`actionEffectLocation${index}`}
          options={locations.map((location) => ({ value: location.uuid, label: location.title }))}
        />
      {:else if isFlagEffect(effect.effect)}
        <GlassSelect
          bind:value={effect.value}
          label="Flag"
          name={`actionEffectFlag${index}`}
          options={flagOptions(effect.effect, flags)}
          on:change={() => changeFlag(index)}
        />
        {@const selectedFlag = flags.find((flag) => flag.uuid === effect.value)}
        {#if effect.effect === "setFlag" && selectedFlag?.valueType === "text"}
          <label class="field-stack">
            <span class="field-label">Value</span>
            <input
              class="text-input"
              maxlength="200"
              value={effect.flagValue ?? ""}
              on:input={(event) => changeFlagValue(index, event)}
            />
          </label>
        {:else if effect.effect !== "clearFlag" && selectedFlag?.valueType === "number"}
          <label class="field-stack">
            <span class="field-label">{effect.effect === "setFlag" ? "Value" : "Amount"}</span>
            <input
              class="text-input"
              type="number"
              min={effect.effect === "setFlag" ? "0" : "1"}
              max="1000000"
              step="1"
              value={effect.amount ?? (effect.effect === "setFlag" ? 0 : 1)}
              on:input={(event) => changeAmount(index, event)}
            />
          </label>
        {/if}
      {:else}
        <TextField
          bind:value={effect.value}
          label={effectValueLabel(effect.effect)}
          name={`actionEffectValue${index}`}
          type={effect.effect === "addLog" ? "text" : "number"}
          min={effect.effect === "cutDecay" ? "0.01" : "0"}
          step="any"
          maxlength={effect.effect === "addLog" ? 500 : undefined}
          required
        />
      {/if}
      <GlassButton
        className="effect-remove-button"
        ariaLabel="Remove completion effect"
        title="Remove completion effect"
        on:click={() => removeEffect(index)}
      >×</GlassButton>
    </div>
  {/each}
  <GlassButton className="effect-add-button" on:click={addEffect}>
    Add effect
  </GlassButton>
</fieldset>
{#if pickerIndex !== null}
  <GameDataView data={gameData} value={effects[pickerIndex]?.value ?? ""}
    selectableType="number" onChoose={chooseField} onClose={() => (pickerIndex = null)} />
{/if}
