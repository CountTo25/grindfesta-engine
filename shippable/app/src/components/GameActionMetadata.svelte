<script lang="ts">
  import ActionMetadata from "../ui/components/ActionMetadata.svelte";
  import { actionDurationSeconds, skillView } from "../game/view";
  import type {
    GameDefinition,
    GeneratedGameState,
    RuntimeAction,
  } from "../game/types";

  export let data: GameDefinition;
  export let state: GeneratedGameState;
  export let action: RuntimeAction;
  export let queuedCount = 0;
  export let known = true;
  export let revealed = true;
  export let requirements = "";

  $: skill = data.skills.find((entry) => entry.uuid === action.skill);
  $: progression = skillView(data, state, action.skill);
  $: duration = actionDurationSeconds(data, state, action);
  $: baseDuration = action.weight / data.engineVariables.baseActionProgressPerSecond;
  $: progress = state.runtime.actionProgress[action.uuid]?.progress ?? 0;
  $: destination = action.movementDestination
    ? data.locations.find((entry) => entry.uuid === action.movementDestination)?.title
    : null;
  $: traits = [
    ...(action.movementDestination
      ? [{
          icon: "→",
          label: revealed && destination ? `Moves to ${destination}` : "Changes location",
        }]
      : []),
    ...(action.repeatable
      ? [{
          icon: "↻",
          label: action.stopOnRepeat
            ? "Reusable · stops after one completion"
            : "Repeats while available",
        }]
      : []),
    ...(action.crossGeneration
      ? [{ icon: "◇", label: "Completion persists between runs" }]
      : []),
  ];
</script>

<ActionMetadata
  title={!revealed && !known ? "Unknown action" : action.title}
  skill={skill?.name ?? "Unknown skill"}
  runModifier={progression.runModifier}
  persistentModifier={progression.persistentModifier}
  totalModifier={progression.modifier}
  {baseDuration}
  {duration}
  {progress}
  weight={action.weight}
  {queuedCount}
  note={requirements}
  {traits}
  actionId={action.uuid}
/>
