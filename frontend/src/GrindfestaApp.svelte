<script lang="ts">
  import DependencyGate from "./lib/components/DependencyGate.svelte";
  import BuildPage from "./lib/components/BuildPage.svelte";
  import EditorShell from "./lib/components/EditorShell.svelte";
  import ProjectEditor from "./lib/components/ProjectEditor.svelte";
  import { glassReflections } from "./lib";
  import {
    appRouteFromLocation,
    routeToLauncher,
    routeToProject,
    routeToProjectBuild,
  } from "./lib/routes";
  import "./lib/styles/ui.css";

  let currentRoute = appRouteFromLocation();

  function syncRoute() {
    currentRoute = appRouteFromLocation();
  }

  function returnToCurrentProject() {
    if (currentRoute.page !== "launcher") routeToProject(currentRoute.projectUuid);
  }

  function buildCurrentProject() {
    if (currentRoute.page !== "launcher") routeToProjectBuild(currentRoute.projectUuid);
  }
</script>

<svelte:window on:popstate={syncRoute} />

<svelte:head>
  <title>Grindfesta Engine</title>
  <meta name="color-scheme" content="dark" />
  <meta name="theme-color" content="#060806" />
</svelte:head>

<main use:glassReflections class="editor-app" aria-label="Grindfesta editor">
  <DependencyGate>
    {#if currentRoute.page === "build"}
      {#key `build-${currentRoute.projectUuid}`}
        <BuildPage
          projectUuid={currentRoute.projectUuid}
          onBack={returnToCurrentProject}
        />
      {/key}
    {:else if currentRoute.page === "editor"}
      {#key currentRoute.projectUuid}
        <ProjectEditor
          projectUuid={currentRoute.projectUuid}
          onClose={routeToLauncher}
          onBuild={buildCurrentProject}
        />
      {/key}
    {:else}
      <EditorShell onOpenProject={(project) => routeToProject(project.uuid)} />
    {/if}
  </DependencyGate>
</main>
