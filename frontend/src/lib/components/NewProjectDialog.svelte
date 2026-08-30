<script lang="ts">
  import { createProject } from "../api/projects";
  import type { Project } from "../api/projects";
  import { uiComponentTemplates } from "../projectTemplates";
  import type { GlassOption } from "./types";
  import GlassButton from "./GlassButton.svelte";
  import GlassSurface from "./GlassSurface.svelte";
  import SegmentedControl from "./SegmentedControl.svelte";
  import TextArea from "./TextArea.svelte";
  import TextField from "./TextField.svelte";

  export let onCancel: () => void;
  export let onCreated: (project: Project) => void;

  const uiComponentOptions: GlassOption[] = uiComponentTemplates;

  let projectName = "";
  let projectDescription = "";
  let uiComponent = "glass";
  let errorMessage = "";
  let submitting = false;

  async function submitProject() {
    const name = projectName.trim();
    if (!name) {
      errorMessage = "Project name is required.";
      return;
    }
    const description = projectDescription.trim();
    if (!description) {
      errorMessage = "Project description is required.";
      return;
    }

    submitting = true;
    errorMessage = "";

    try {
      onCreated(await createProject({ name, description, uiComponent }));
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Project could not be created.";
    } finally {
      submitting = false;
    }
  }
</script>

<div class="project-backdrop">
  <GlassSurface
    variant="menu"
    className="project-dialog"
    role="dialog"
    labelledBy="newProjectTitle"
  >
    <form class="project-form" on:submit|preventDefault={submitProject}>
      <h2 id="newProjectTitle">New project</h2>
      <TextField
        bind:value={projectName}
        label="Project name"
        name="projectName"
        maxlength={80}
        required
        autocomplete="off"
      />
      <TextArea
        bind:value={projectDescription}
        label="Description"
        name="projectDescription"
        maxlength={500}
        required
      />
      <div class="field-stack">
        <span class="field-label">UI components</span>
        <SegmentedControl
          bind:value={uiComponent}
          options={uiComponentOptions}
          ariaLabel="UI components"
        />
      </div>
      {#if errorMessage}
        <p class="project-error" role="alert">{errorMessage}</p>
      {/if}
      <div class="project-actions">
        <GlassButton disabled={submitting} on:click={onCancel}>Cancel</GlassButton>
        <GlassButton type="submit" variant="primary" disabled={submitting}>
          Create
        </GlassButton>
      </div>
    </form>
  </GlassSurface>
</div>
