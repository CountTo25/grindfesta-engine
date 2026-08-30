<script lang="ts">
  import type { GameDataSnapshot, JsonValue } from "../gameData";
  import GameDataTreeNode from "./GameDataTreeNode.svelte";
  import GlassButton from "./GlassButton.svelte";
  import GlassSurface from "./GlassSurface.svelte";

  export let data: GameDataSnapshot;
  export let value = "";
  export let selectableType: "number" | undefined = undefined;
  export let onChoose: (path: string, value: JsonValue) => void;
  export let onClose: () => void;

  let selectedPath = value;
  let selectedValue: JsonValue | undefined;

  function select(path: string, fieldValue: JsonValue) {
    selectedPath = path;
    selectedValue = fieldValue;
  }

  function choose() {
    if (!selectedPath || selectedValue === undefined) return;
    onChoose(selectedPath, selectedValue);
    onClose();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") onClose();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="game-data-backdrop" role="presentation" on:click|self={onClose}>
  <GlassSurface tag="section" className="game-data-dialog" role="dialog"
    labelledBy="gameDataViewTitle" occludes>
    <header class="game-data-header">
      <div>
        <span class="field-label">Active run JSON</span>
        <h2 id="gameDataViewTitle">Game data</h2>
      </div>
      <GlassButton ariaLabel="Close game data" on:click={onClose}>Close</GlassButton>
    </header>
    <div class="game-data-tree" role="tree" aria-label="Game data fields">
      {#each Object.entries(data) as [key, field] (key)}
        <GameDataTreeNode nodeKey={key} value={field} path={`$.${key}`}
          selectedPath={selectedPath} {selectableType} onSelect={select} />
      {/each}
    </div>
    <footer class="game-data-footer">
      <div class="game-data-selection">
        <span class="field-label">Selected field</span>
        <code>{selectedPath || "No field selected"}</code>
        {#if selectedValue !== undefined}
          <span>{JSON.stringify(selectedValue)}</span>
        {/if}
      </div>
      <GlassButton variant="primary"
        disabled={!selectedPath || (selectableType === "number" && typeof selectedValue !== "number")}
        on:click={choose}>
        Use field
      </GlassButton>
    </footer>
  </GlassSurface>
</div>
