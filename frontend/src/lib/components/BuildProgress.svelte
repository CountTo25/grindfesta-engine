<script lang="ts">
  import type { BuildStep } from "../api/build";

  export let steps: BuildStep[] = [];
</script>

<ol class="build-progress" aria-label="Build progress">
  {#each steps as step (step.id)}
    <li class="build-progress-step" data-status={step.status}>
      <span class="build-step-marker" aria-hidden="true"></span>
      <div>
        <strong>{step.label}</strong>
        <span>{step.message}</span>
      </div>
    </li>
  {/each}
</ol>
