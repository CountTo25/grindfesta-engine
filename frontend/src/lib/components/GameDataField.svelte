<script lang="ts">
  import GlassButton from "./GlassButton.svelte";

  export let value = "";
  export let label = "Field";
  export let onPick: () => void;
</script>

<div class="field-stack game-data-field">
  <span class="field-label">{label}</span>
  <GlassButton className="game-data-field-button" on:click={onPick}>
    <code>{value || "Select field"}</code>
  </GlassButton>
</div>
