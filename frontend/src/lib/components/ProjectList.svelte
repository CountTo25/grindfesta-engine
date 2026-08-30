<script lang="ts">
  import type { Project } from "../api/projects";
  import GlassButton from "./GlassButton.svelte";

  export let projects: Project[] = [];
  export let loaded = false;
  export let errorMessage = "";
  export let onOpen: (project: Project) => void;
</script>

<div class="project-list-area">
  {#if projects.length > 0}
    <div class="project-list" aria-label="Projects">
      {#each projects as project (project.name)}
        <GlassButton className="project-list-item" on:click={() => onOpen(project)}>
          <span class="project-list-copy">
            <strong>{project.name}</strong>
            <small>{project.description}</small>
          </span>
        </GlassButton>
      {/each}
    </div>
  {:else if errorMessage}
    <p class="project-scan-error" role="alert">{errorMessage}</p>
  {:else if loaded}
    <p class="project-empty-copy">No projects yet</p>
  {/if}
</div>
