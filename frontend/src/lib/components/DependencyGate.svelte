<script lang="ts">
  import { onMount } from "svelte";
  import { loadDependencies } from "../api/dependencies";
  import type { DependencyReport } from "../api/dependencies";
  import DependencyPrompt from "./DependencyPrompt.svelte";
  import GlassButton from "./GlassButton.svelte";
  import GlassSurface from "./GlassSurface.svelte";

  let report: DependencyReport | null = null;
  let errorMessage = "";
  let checking = true;

  async function refreshDependencies() {
    checking = true;
    errorMessage = "";

    try {
      report = await loadDependencies();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Unable to check dependencies.";
    } finally {
      checking = false;
    }
  }

  onMount(refreshDependencies);

  $: missingDependencies = report?.dependencies.filter((dependency) => !dependency.installed) ?? [];
</script>

{#if checking && !report}
  <slot />
{:else if errorMessage}
  <GlassSurface tag="section" className="gate-panel" labelledBy="checkErrorTitle">
    <div class="gate-error">
      <p class="eyebrow">Editor unavailable</p>
      <h1 id="checkErrorTitle">Dependency check failed</h1>
      <p class="error-text">{errorMessage}</p>
      <GlassButton variant="primary" on:click={refreshDependencies}>Try again</GlassButton>
    </div>
  </GlassSurface>
{:else if report && !report.allInstalled}
  <DependencyPrompt
    dependencies={missingDependencies}
    {checking}
    onRetry={refreshDependencies}
  />
{:else}
  <slot />
{/if}
