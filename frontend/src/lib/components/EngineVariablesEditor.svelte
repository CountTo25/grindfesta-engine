<script lang="ts">
  import {
    updateEngineVariables,
    type Project,
  } from "../api/projects";
  import {
    engineVariableDefinitions,
    engineVariableForm,
    engineVariableGroups,
    parseEngineVariables,
    type EngineVariableKey,
  } from "../engineVariableDefinitions";
  import EngineVariableField from "./EngineVariableField.svelte";
  import GlassButton from "./GlassButton.svelte";

  export let projectUuid: string;
  export let project: Project;
  export let onUpdated: (project: Project) => void;

  let form = engineVariableForm(project.engineVariables);
  let saving = false;
  let saved = false;
  let errorMessage = "";

  $: parsed = parseEngineVariables(form);
  $: dirty = parsed !== null &&
    engineVariableDefinitions.some(
      ({ key }) => parsed?.[key] !== project.engineVariables[key],
    );

  function update(key: EngineVariableKey, value: string) {
    form = { ...form, [key]: value };
    saved = false;
  }

  function groupId(group: string) {
    return `engine-${group.toLowerCase().replaceAll(" ", "-")}`;
  }

  async function save() {
    if (!parsed || !dirty) return;
    saving = true;
    errorMessage = "";
    try {
      const updated = await updateEngineVariables(projectUuid, parsed);
      project = updated;
      form = engineVariableForm(updated.engineVariables);
      saved = true;
      onUpdated(updated);
    } catch (error) {
      errorMessage = error instanceof Error
        ? error.message : "Engine variables could not be saved.";
    } finally {
      saving = false;
    }
  }
</script>

<section class="engine-variables-editor" aria-labelledby="engine-variables-title">
  <header class="engine-variables-heading">
    <div>
      <p>Project runtime</p>
      <h1 id="engine-variables-title">Engine variables</h1>
    </div>
    <GlassButton disabled={!dirty || saving} on:click={save}>
      {saving ? "Saving…" : saved ? "Saved" : "Save"}
    </GlassButton>
  </header>

  <div class="engine-variable-groups">
    {#each engineVariableGroups as group (group)}
      <section class="engine-variable-group" aria-labelledby={groupId(group)}>
        <h2 id={groupId(group)}>{group}</h2>
        <div class="engine-variable-fields">
          {#each engineVariableDefinitions.filter((entry) => entry.group === group)
            as definition (definition.key)}
            <EngineVariableField
              {definition}
              value={form[definition.key]}
              onChange={(value) => update(definition.key, value)}
            />
          {/each}
        </div>
      </section>
    {/each}
  </div>
  {#if !parsed}<p class="engine-variables-error" role="alert">Correct invalid values to save.</p>{/if}
  {#if errorMessage}<p class="engine-variables-error" role="alert">{errorMessage}</p>{/if}
</section>
