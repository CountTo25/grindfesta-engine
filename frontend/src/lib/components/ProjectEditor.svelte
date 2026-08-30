<script lang="ts">
  import { onMount } from "svelte";
  import { listProjects } from "../api/projects";
  import type { Project } from "../api/projects";
  import ActionEditor from "./ActionEditor.svelte";
  import FlagEditor from "./FlagEditor.svelte";
  import GlassButton from "./GlassButton.svelte";
  import GlassSurface from "./GlassSurface.svelte";
  import LocationEditor from "./LocationEditor.svelte";
  import ItemEditor from "./ItemEditor.svelte";
  import SkillEditor from "./SkillEditor.svelte";
  import UiEditor from "./UiEditor.svelte";
  import EngineVariablesEditor from "./EngineVariablesEditor.svelte";
  import OverviewEditor from "./OverviewEditor.svelte";

  export let projectUuid: string;
  export let onClose: () => void;
  export let onBuild: () => void;

  let project: Project | null = null;
  let unavailable = false;
  let hasSkills = false;
  type EditorSection =
    | "actions" | "engineVariables" | "flags" | "items" | "locations" | "overview" | "skills" | "ui";
  let currentSection: EditorSection = "skills";
  onMount(async () => {
    try {
      project = (await listProjects()).find((candidate) => candidate.uuid === projectUuid) ?? null;
      unavailable = !project;
    } catch {
      unavailable = true;
    }
  });
</script>

<GlassSurface tag="section" className="project-editor-panel" ariaLabel="Project editor">
  <header class="project-editor-toolbar">
    <GlassButton on:click={onClose}>Projects</GlassButton>
    <strong>{project?.name ?? ""}</strong>
    <nav class="editor-section-navigation" aria-label="Editor sections">
      <GlassButton
        className="editor-section-button"
        active={currentSection === "skills"}
        pressed={currentSection === "skills"}
        on:click={() => (currentSection = "skills")}
      >
        Skills
      </GlassButton>
      <GlassButton
        className="editor-section-button"
        active={currentSection === "locations"}
        pressed={currentSection === "locations"}
        on:click={() => (currentSection = "locations")}
      >
        Locations
      </GlassButton>
      <GlassButton
        className="editor-section-button"
        active={currentSection === "items"}
        pressed={currentSection === "items"}
        on:click={() => (currentSection = "items")}
      >
        Items
      </GlassButton>
      <GlassButton
        className="editor-section-button"
        active={currentSection === "flags"}
        pressed={currentSection === "flags"}
        on:click={() => (currentSection = "flags")}
      >
        Flags
      </GlassButton>
      <GlassButton
        className="editor-section-button"
        active={currentSection === "actions"}
        pressed={currentSection === "actions"}
        disabled={!hasSkills}
        on:click={() => (currentSection = "actions")}
      >
        Actions
      </GlassButton>
      <GlassButton
        className="editor-section-button"
        active={currentSection === "overview"}
        pressed={currentSection === "overview"}
        on:click={() => (currentSection = "overview")}
      >
        Overview
      </GlassButton>
      <GlassButton
        className="editor-section-button"
        active={currentSection === "ui"}
        pressed={currentSection === "ui"}
        on:click={() => (currentSection = "ui")}
      >
        UI
      </GlassButton>
      <GlassButton
        className="editor-section-button engine-variables-tab"
        active={currentSection === "engineVariables"}
        pressed={currentSection === "engineVariables"}
        on:click={() => (currentSection = "engineVariables")}
      >
        Engine variables
      </GlassButton>
    </nav>
    <GlassButton
      className="project-build-button"
      disabled={!project}
      title="Open the project build"
      on:click={onBuild}
    >
      Build game
    </GlassButton>
  </header>
  <div class="project-editor-workspace">
    {#if project}
      {#if currentSection === "skills"}
        <SkillEditor
          {projectUuid}
          onSkillCountChanged={(count) => (hasSkills = count > 0)}
        />
        <div class="project-editor-canvas"></div>
      {:else if currentSection === "locations"}
        <LocationEditor {projectUuid} />
      {:else if currentSection === "items"}
        <ItemEditor {projectUuid} />
      {:else if currentSection === "flags"}
        <FlagEditor {projectUuid} />
      {:else if currentSection === "actions"}
        <ActionEditor {projectUuid} {project} />
      {:else if currentSection === "ui"}
        <UiEditor
          {projectUuid}
          {project}
          onUpdated={(updated) => (project = updated)}
        />
      {:else if currentSection === "overview"}
        <OverviewEditor {projectUuid} />
      {:else}
        <EngineVariablesEditor
          {projectUuid}
          {project}
          onUpdated={(updated) => (project = updated)}
        />
      {/if}
    {:else if unavailable}
      <p class="project-unavailable" role="alert">Project is unavailable.</p>
    {/if}
  </div>
</GlassSurface>
