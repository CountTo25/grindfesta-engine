<script lang="ts">
  import {
    appendGameDataPath,
    gameDataNodeLabel,
    isJsonContainer,
    jsonValuePreview,
    jsonValueType,
    type JsonValue,
  } from "../gameData";

  export let nodeKey: string;
  export let value: JsonValue;
  export let path: string;
  export let depth = 0;
  export let arrayEntry = false;
  export let selectedPath = "";
  export let selectableType: "number" | undefined = undefined;
  export let onSelect: (path: string, value: JsonValue) => void;

  let expanded = false;
  $: container = isJsonContainer(value);
  $: entries = container
    ? Object.entries(value as JsonValue[] | Record<string, JsonValue>)
    : [];
  $: type = jsonValueType(value);
  $: label = gameDataNodeLabel(nodeKey, value, arrayEntry);
  $: selectable = selectableType === undefined || type === selectableType;
</script>

<div class="game-data-node">
  {#if container}
    <button
      type="button"
      class="game-data-node-row game-data-branch"
      style={`--game-data-depth: ${depth}`}
      aria-expanded={expanded}
      on:click={() => (expanded = !expanded)}
    >
      <span class="game-data-disclosure" aria-hidden="true">{expanded ? "−" : "+"}</span>
      <code>{label}</code>
      <span class="game-data-type">{type} · {entries.length}</span>
    </button>
    {#if expanded}
      <div class="game-data-children">
        {#each entries as [childKey, childValue] (childKey)}
          <svelte:self
            nodeKey={childKey}
            value={childValue}
            path={appendGameDataPath(path, childKey, Array.isArray(value))}
            depth={depth + 1}
            arrayEntry={Array.isArray(value)}
            {selectedPath}
            {selectableType}
            {onSelect}
          />
        {/each}
      </div>
    {/if}
  {:else}
    <button
      type="button"
      class="game-data-node-row game-data-leaf"
      class:selected={selectedPath === path}
      style={`--game-data-depth: ${depth}`}
      aria-pressed={selectedPath === path}
      disabled={!selectable}
      title={selectable ? undefined : "Only number fields can be selected"}
      on:click={() => onSelect(path, value)}
    >
      <span class="game-data-leaf-marker" aria-hidden="true"></span>
      <code>{label}</code>
      <span class="game-data-value">{jsonValuePreview(value)}</span>
      <span class="game-data-type">{type}</span>
    </button>
  {/if}
</div>
