<script lang="ts">
  import { onMount } from "svelte";
  import { listProjects } from "../api/projects";
  import type { Project } from "../api/projects";
  import GlassButton from "./GlassButton.svelte";
  import GlassSurface from "./GlassSurface.svelte";
  import NewProjectDialog from "./NewProjectDialog.svelte";
  import ProjectList from "./ProjectList.svelte";

  export let onOpenProject: (project: Project) => void;

  let projects: Project[] = [];
  let dialogOpen = false;
  let projectsLoaded = false;
  let scanError = "";

  async function scanProjects() {
    scanError = "";
    try {
      projects = await listProjects();
    } catch (error) {
      scanError = error instanceof Error ? error.message : "Projects could not be loaded.";
    } finally {
      projectsLoaded = true;
    }
  }

  async function projectCreated() {
    dialogOpen = false;
    await scanProjects();
  }

  onMount(scanProjects);
</script>

<GlassSurface tag="section" className="editor-panel" ariaLabel="Editor workspace">
  <GlassSurface className="project-start-panel" ariaLabel="Project actions">
    <div class="project-start-action">
      <GlassButton
        variant="standalone"
        className="new-project-trigger"
        on:click={() => (dialogOpen = true)}
      >
        Create new project
      </GlassButton>
    </div>
    <ProjectList
      {projects}
      loaded={projectsLoaded}
      errorMessage={scanError}
      onOpen={onOpenProject}
    />
  </GlassSurface>
</GlassSurface>

{#if dialogOpen}
  <NewProjectDialog
    onCancel={() => (dialogOpen = false)}
    onCreated={projectCreated}
  />
{/if}
