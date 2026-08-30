<script lang="ts">
  import { onMount } from "svelte";
  import {
    actionConditionIsComplete,
    actionEffectIsComplete,
    actionRepetitionMode,
    actionRevealIsComplete,
    createAction,
    listActions,
    updateAction,
    type ActionCondition,
    type ActionConditionJoin,
    type ActionDefinition,
    type ActionEffect,
    type ActionRepetitionMode,
    type ActionRevealCondition,
  } from "../api/actions";
  import { listItems, type ItemDefinition } from "../api/items";
  import { listFlags, type FlagDefinition } from "../api/flags";
  import { listLocations, type LocationDefinition } from "../api/locations";
  import { listSkills, type SkillDefinition } from "../api/skills";
  import type { Project } from "../api/projects";
  import { buildActiveRunGameData } from "../gameData";
  import ActionConditionsEditor from "./ActionConditionsEditor.svelte";
  import ActionDefinitionList from "./ActionDefinitionList.svelte";
  import ActionEffectsEditor from "./ActionEffectsEditor.svelte";
  import ActionRepetitionControl from "./ActionRepetitionControl.svelte";
  import ActionRevealEditor from "./ActionRevealEditor.svelte";
  import GlassButton from "./GlassButton.svelte";
  import GlassSelect from "./GlassSelect.svelte";
  import TextArea from "./TextArea.svelte";
  import TextField from "./TextField.svelte";
  export let projectUuid: string;
  export let project: Project;
  let actions: ActionDefinition[] = [];
  let skills: SkillDefinition[] = [];
  let locations: LocationDefinition[] = [];
  let items: ItemDefinition[] = [];
  let flags: FlagDefinition[] = [];
  let title = "";
  let flavour = "";
  let weight = "1";
  let repetitionMode: ActionRepetitionMode = "once";
  let requiredSkill = "";
  let conditions: ActionCondition[] = [];
  let revealConditions: ActionRevealCondition[] = [];
  let conditionJoin: ActionConditionJoin = "and";
  let completionEffects: ActionEffect[] = [];
  let editingUuid = "";
  let errorMessage = "";
  let submitting = false;
  $: skillOptions = skills.map((skill) => ({ value: skill.uuid, label: skill.name }));
  $: numericWeight = Number(weight);
  $: gameData = buildActiveRunGameData(project, skills, locations, items, flags, actions);
  $: canSave =
    Boolean(title.trim()) &&
    Boolean(flavour.trim()) &&
    Boolean(requiredSkill) &&
    conditions.every(actionConditionIsComplete) &&
    revealConditions.every(actionRevealIsComplete) &&
    completionEffects.every((effect) => actionEffectIsComplete(effect, flags)) &&
    Number.isFinite(numericWeight) &&
    numericWeight > 0;
  onMount(async () => {
    try {
      [actions, skills, locations, items, flags] = await Promise.all([
        listActions(projectUuid),
        listSkills(projectUuid),
        listLocations(projectUuid),
        listItems(projectUuid),
        listFlags(projectUuid),
      ]);
      requiredSkill = skills[0]?.uuid ?? "";
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Actions could not be loaded.";
    }
  });
  async function saveAction() {
    if (!canSave) {
      errorMessage = "Complete every action field.";
      return;
    }
    submitting = true;
    errorMessage = "";
    try {
      const input = {
        title: title.trim(),
        flavour: flavour.trim(),
        weight: numericWeight,
        repeatable: repetitionMode !== "once",
        stopOnRepeat: repetitionMode === "reusable",
        requiredSkill,
        conditionJoin,
        conditions,
        revealConditions,
        completionEffects,
      };
      const action = editingUuid
        ? await updateAction(projectUuid, editingUuid, input)
        : await createAction(projectUuid, input);
      actions = editingUuid
        ? actions.map((candidate) => candidate.uuid === action.uuid ? action : candidate)
        : [...actions, action];
      resetForm();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Action could not be saved.";
    } finally {
      submitting = false;
    }
  }
  function editAction(action: ActionDefinition) {
    editingUuid = action.uuid;
    title = action.title;
    flavour = action.flavour;
    weight = String(action.weight);
    repetitionMode = actionRepetitionMode(action);
    requiredSkill = action.requiredSkill;
    conditionJoin = action.conditionJoin;
    conditions = action.conditions.map((condition) => ({ ...condition }));
    revealConditions = action.revealConditions.map((condition) => ({ ...condition }));
    completionEffects = action.completionEffects.map((effect) => ({ ...effect }));
  }
  function resetForm() {
    editingUuid = "";
    title = "";
    flavour = "";
    weight = "1";
    repetitionMode = "once";
    conditions = [];
    revealConditions = [];
    completionEffects = [];
    conditionJoin = "and";
  }
</script>

<section class="action-editor" aria-label="Actions">
  <div class="action-form-pane">
    <form class="action-create-form" on:submit|preventDefault={saveAction}>
      <TextField
        bind:value={title}
        label="Title"
        name="actionTitle"
        maxlength={80}
        required
        autocomplete="off"
      />
      <TextArea
        bind:value={flavour}
        label="Flavour"
        name="actionFlavour"
        maxlength={500}
        rows={3}
        required
      />
      <TextField
        bind:value={weight}
        label="Weight"
        name="actionWeight"
        type="number"
        min="0.01"
        step="any"
        required
        autocomplete="off"
      />
      <ActionRepetitionControl bind:value={repetitionMode}
        onChange={(value) => (repetitionMode = value)} />
      <GlassSelect
        bind:value={requiredSkill}
        label="Required skill"
        name="requiredSkill"
        options={skillOptions}
      />
      <ActionConditionsEditor bind:conditions bind:conditionJoin {locations} {actions} {items}
        {flags} {gameData} />
      <ActionRevealEditor bind:revealConditions {locations} {actions} {items} {flags} {gameData} />
      <ActionEffectsEditor bind:effects={completionEffects} {items} {flags} {locations} {gameData} />
      {#if editingUuid}
        <GlassButton on:click={resetForm}>Cancel editing</GlassButton>
      {/if}
      <GlassButton
        type="submit"
        variant={canSave ? "primary" : "transparent"}
        disabled={submitting}
      >
        {editingUuid ? "Save changes" : "Save"}
      </GlassButton>
    </form>
    {#if errorMessage}
      <p class="action-error" role="alert">{errorMessage}</p>
    {/if}
  </div>
  <ActionDefinitionList {actions} {skills} {locations} {items} {flags}
    engineVariables={project.engineVariables}
    onEdit={editAction} />
</section>
