<script lang="ts">
  import SegmentedControl from "./SegmentedControl.svelte";
  import TextField from "./TextField.svelte";

  export let enabled = false;
  export let missingEnergy = "1";
  export let restoredEnergy = "1";
  export let cooldownSeconds = "5";
</script>

<fieldset class="item-auto-use-editor">
  <legend>Use mode</legend>
  <SegmentedControl
    value={enabled ? "auto" : "stored"}
    options={[
      { value: "stored", label: "Stored" },
      { value: "auto", label: "Auto-use" },
    ]}
    ariaLabel="Item use mode"
    onChange={(value) => (enabled = value === "auto")}
  />
  {#if enabled}
    <div class="item-auto-use-fields">
      <TextField
        bind:value={missingEnergy}
        label="Use when energy missing"
        name="itemMissingEnergy"
        type="number"
        min="0.01"
        max="1000000"
        step="0.01"
      />
      <TextField
        bind:value={restoredEnergy}
        label="Restore energy"
        name="itemRestoredEnergy"
        type="number"
        min="0.01"
        max="1000000"
        step="0.01"
      />
      <TextField
        bind:value={cooldownSeconds}
        label="Cooldown (seconds)"
        name="itemCooldown"
        type="number"
        min="0"
        max="86400"
        step="0.1"
      />
    </div>
  {/if}
</fieldset>
