<script lang="ts">
  import { onMount } from "svelte";
  import { compileWithProgress, type BuildEvent, type BuildStep } from "../api/build";
  import { apiUrl } from "../api/client";
  import { listActions } from "../api/actions";
  import { listIconLibraries } from "../api/iconLibraries";
  import { listLocations } from "../api/locations";
  import { listProjects, type CompiledProject, type Project } from "../api/projects";
  import { listSkills } from "../api/skills";
  import BuildProgress from "./BuildProgress.svelte";
  import GlassButton from "./GlassButton.svelte";
  import GlassSurface from "./GlassSurface.svelte";

  export let projectUuid: string;
  export let onBack: () => void;

  const stepDefinitions = [
    ["preparing", "Prepare project"],
    ["generating", "Generate TypeScript"],
    ["scaffolding", "Assemble game"],
    ["dependencies", "Install dependencies"],
    ["checking", "Validate source"],
    ["bundling", "Create production bundle"],
    ["publishing", "Publish artifacts"],
  ] as const;

  let project: Project | null = null;
  let counts = { skills: 0, locations: 0, actions: 0, iconLibraries: 0 };
  let state: "loading" | "building" | "built" | "failed" = "loading";
  let result: CompiledProject | null = null;
  let errorMessage = "";
  let steps = resetSteps();
  $: launchUrl = result ? apiUrl(result.launchPath) : "";
  $: archiveUrl = apiUrl(`/projects/${encodeURIComponent(projectUuid)}/shippable`);

  function resetSteps(): BuildStep[] {
    return stepDefinitions.map(([id, label]) => ({
      id,
      label,
      status: "pending",
      message: "Waiting",
    }));
  }

  function applyBuildEvent(event: BuildEvent) {
    if (event.stage === "build" && event.status === "failed") {
      const runningStage = steps.find((step) => step.status === "running")?.id;
      const failedStage = runningStage ?? steps.find((step) => step.status === "pending")?.id;
      steps = steps.map((step) =>
        step.id === failedStage
          ? { ...step, status: "failed", message: event.message }
          : step,
      );
      return;
    }
    steps = steps.map((step) =>
      step.id === event.stage
        ? { ...step, status: event.status, message: event.message }
        : step,
    );
  }

  async function loadProject() {
    const [projects, skills, locations, actions, iconLibraries] = await Promise.all([
      listProjects(),
      listSkills(projectUuid),
      listLocations(projectUuid),
      listActions(projectUuid),
      listIconLibraries(projectUuid),
    ]);
    project = projects.find((candidate) => candidate.uuid === projectUuid) ?? null;
    counts = {
      skills: skills.length,
      locations: locations.length,
      actions: actions.length,
      iconLibraries: iconLibraries.length,
    };
  }

  async function build() {
    state = "building";
    result = null;
    errorMessage = "";
    steps = resetSteps();
    try {
      result = await compileWithProgress(projectUuid, applyBuildEvent);
      state = "built";
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Game build failed.";
      state = "failed";
    }
  }

  onMount(async () => {
    try {
      await loadProject();
      if (!project) throw new Error("Project is unavailable.");
      await build();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Build could not start.";
      state = "failed";
    }
  });
</script>

<GlassSurface tag="section" className="build-page" ariaLabel="Project build">
  <header class="build-toolbar">
    <GlassButton on:click={onBack}>Editor</GlassButton>
    <strong>{project?.name ?? "Build"}</strong>
    <span class="build-state" data-state={state} aria-live="polite">
      {state === "building" ? "Building" : state === "built" ? "Built" : state === "failed" ? "Failed" : "Loading"}
    </span>
  </header>

  <div class="build-workspace">
    <section class="build-definition" aria-labelledby="build-definition-title">
      <div>
        <h1 id="build-definition-title">{project?.name ?? "Preparing build"}</h1>
      </div>
      <dl class="build-facts">
        <div><dt>UI</dt><dd>{project?.ui.componentSet ?? "—"}</dd></div>
        <div><dt>Skills</dt><dd>{counts.skills}</dd></div>
        <div><dt>Locations</dt><dd>{counts.locations}</dd></div>
        <div><dt>Actions</dt><dd>{counts.actions}</dd></div>
        <div><dt>Icon sets</dt><dd>{counts.iconLibraries}</dd></div>
      </dl>
      <BuildProgress {steps} />
    </section>

    <section class="build-output" aria-labelledby="build-output-title">
      <div class="build-output-heading">
        <div>
          <h2 id="build-output-title">Build output</h2>
        </div>
        <GlassButton disabled={state === "building" || state === "loading"} on:click={build}>
          Rebuild
        </GlassButton>
      </div>
      {#if errorMessage}
        <pre class="build-error" role="alert">{errorMessage}</pre>
      {:else if result}
        <dl class="build-paths">
          <div><dt>Project output</dt><dd>{result.outputPath}</dd></div>
          <div><dt>Entry file</dt><dd>{result.entryPath}</dd></div>
          <div><dt>Launch URL</dt><dd>{launchUrl}</dd></div>
        </dl>
        <div class="build-output-actions">
          <a
            class="glass-control primary-control build-output-button"
            href={launchUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Launch game
          </a>
          <a class="glass-control build-output-button" href={archiveUrl} download>
            Download shippable archive
          </a>
        </div>
      {:else}
        <p class="build-output-pending" aria-live="polite">Build output will appear here when the build completes.</p>
      {/if}
    </section>
  </div>
</GlassSurface>
