<script lang="ts">
  import {
    updateProjectUi,
    type Project,
    type UiControlMode,
    type UiControls,
    type UiThemeVariables,
  } from "../api/projects";
  import { getUiComponentTemplate, hexToRgbChannels } from "../projectTemplates";
  import GlassButton from "./GlassButton.svelte";
  import IconPickerDialog from "./IconPickerDialog.svelte";
  import SegmentedControl from "./SegmentedControl.svelte";
  import UiThemeVariablesEditor from "./UiThemeVariables.svelte";
  import UiControlsPreview from "./UiControlsPreview.svelte";

  export let projectUuid: string;
  export let project: Project;
  export let onUpdated: (project: Project) => void;

  type ControlKey = keyof UiControls;
  const controlKeys: ControlKey[] = ["play", "pause", "queue", "energy"];
  const labels: Record<ControlKey, string> = {
    play: "Play",
    pause: "Pause",
    queue: "Queue",
    energy: "Energy",
  };
  const template = getUiComponentTemplate(project.ui.componentSet);
  const variableDefinitions = template?.variables ?? {};
  const variableDefaults = Object.fromEntries(
    Object.entries(variableDefinitions).map(([key, definition]) => [key, definition.value]),
  );
  let controls = structuredClone(project.ui.controls);
  let variables: UiThemeVariables = { ...variableDefaults, ...project.ui.variables };
  let iconPicker: ControlKey | null = null;
  let saving = false;
  let saved = false;
  let errorMessage = "";

  $: projectVariables = { ...variableDefaults, ...project.ui.variables };
  $: previewAccent = hexToRgbChannels(
    variables.glassAccent ?? variableDefaults.glassAccent,
  );
  $: dirty =
    JSON.stringify(controls) !== JSON.stringify(project.ui.controls) ||
    JSON.stringify(variables) !== JSON.stringify(projectVariables);

  function setMode(control: ControlKey, mode: string) {
    controls = {
      ...controls,
      [control]: { ...controls[control], mode: mode as UiControlMode },
    };
    saved = false;
  }

  function chooseIcon(control: ControlKey, icon: string) {
    controls = {
      ...controls,
      [control]: {
        icon,
        mode: icon ? "icon" : "text",
      },
    };
    saved = false;
  }

  async function save() {
    saving = true;
    errorMessage = "";
    try {
      const updated = await updateProjectUi(projectUuid, controls, variables);
      project = updated;
      controls = structuredClone(updated.ui.controls);
      variables = { ...variableDefaults, ...updated.ui.variables };
      saved = true;
      onUpdated(updated);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "UI settings could not be saved.";
    } finally {
      saving = false;
    }
  }
</script>

<div class="ui-editor" style={previewAccent ? `--ui-accent: ${previewAccent}` : undefined}>
  <section class="ui-control-settings" aria-labelledby="ui-controls-title">
    <header class="ui-editor-heading">
      <div>
        <p>Controls</p>
        <h1 id="ui-controls-title">Text and icons</h1>
      </div>
      <GlassButton disabled={!dirty || saving} on:click={save}>
        {saving ? "Saving…" : saved ? "Saved" : "Save"}
      </GlassButton>
    </header>

    <UiThemeVariablesEditor
      definitions={variableDefinitions}
      values={variables}
      onChange={(nextVariables) => {
        variables = nextVariables;
        saved = false;
      }}
    />

    <div class="ui-control-list">
      {#each controlKeys as control (control)}
        <article class="ui-control-row">
          <div class="ui-control-name">
            <strong>{labels[control]}</strong>
            <span>{controls[control].icon || "No icon selected"}</span>
          </div>
          <SegmentedControl
            value={controls[control].mode}
            ariaLabel={`${labels[control]} presentation`}
            options={[
              { value: "text", label: "Text" },
              { value: "icon", label: "Icon", disabled: !controls[control].icon },
            ]}
            onChange={(mode) => setMode(control, mode)}
          />
          <GlassButton className="ui-icon-picker-button" on:click={() => (iconPicker = control)}>
            <span class="ui-icon-picker-content">
              <span class="ui-icon-picker-preview" aria-hidden="true">
                {#if controls[control].icon}<i class={controls[control].icon}></i>{/if}
              </span>
              <span>Choose icon</span>
            </span>
          </GlassButton>
        </article>
      {/each}
    </div>
    {#if errorMessage}<p class="ui-editor-error" role="alert">{errorMessage}</p>{/if}
  </section>

  <UiControlsPreview {controls} />
</div>

{#if iconPicker}
  {@const selectedControl = iconPicker}
  <IconPickerDialog
    {projectUuid}
    currentIcon={controls[selectedControl].icon}
    title={`Choose ${labels[selectedControl].toLowerCase()} icon`}
    onChoose={(icon) => chooseIcon(selectedControl, icon)}
    onClose={() => (iconPicker = null)}
  />
{/if}
