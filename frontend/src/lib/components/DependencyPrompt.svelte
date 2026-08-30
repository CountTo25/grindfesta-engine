<script lang="ts">
  import type { DependencyStatus } from "../api/dependencies";
  import GlassButton from "./GlassButton.svelte";
  import GlassSurface from "./GlassSurface.svelte";

  export let dependencies: DependencyStatus[] = [];
  export let checking = false;
  export let onRetry: () => void;
</script>

<div class="dependency-backdrop">
  <GlassSurface
    variant="menu"
    className="dependency-prompt"
    role="alertdialog"
    labelledBy="dependencyTitle"
    ariaLabel="Missing dependencies"
  >
    <div class="dependency-prompt-content">
      <p class="eyebrow">Setup required</p>
      <h2 id="dependencyTitle">Install editor dependencies</h2>
      <p class="muted-text">
        Grindfesta needs the following tools before the editor can open.
      </p>

      <ul class="dependency-list">
        {#each dependencies as dependency}
          <li>
            <div>
              <strong>{dependency.name}</strong>
              <code>{dependency.command}</code>
            </div>
            <a
              class="install-link glass-control standalone-control"
              href={dependency.installUrl}
              target="_blank"
              rel="noreferrer"
            >Install</a>
          </li>
        {/each}
      </ul>

      <div class="dependency-actions">
        <GlassButton variant="primary" disabled={checking} on:click={onRetry}>
          {checking ? "Checking…" : "Check again"}
        </GlassButton>
      </div>
    </div>
  </GlassSurface>
</div>
