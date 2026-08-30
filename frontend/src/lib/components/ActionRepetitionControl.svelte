<script lang="ts">
  import type { ActionRepetitionMode } from "../api/actions";
  import SegmentedControl from "./SegmentedControl.svelte";

  export let value: ActionRepetitionMode;
  export let onChange: (value: ActionRepetitionMode) => void;

  const options = [
    { value: "once", label: "Once", description: "One completion" },
    { value: "reusable", label: "Reusable", description: "Stops each time" },
    { value: "repeatable", label: "Repeatable", description: "Auto-loops" },
  ];
</script>

<div class="field-stack">
  <span class="field-label">Repetition</span>
  <SegmentedControl
    {value}
    {options}
    ariaLabel="Action repetition"
    onChange={(next) => onChange(next as ActionRepetitionMode)}
  />
</div>
