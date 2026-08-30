<script lang="ts">
  import type { UiControls } from "../api/projects";

  export let controls: UiControls;

  type ControlKey = keyof UiControls;
  const actionControls: ControlKey[] = ["play", "pause", "queue"];
  const labels: Record<ControlKey, string> = {
    play: "Play",
    pause: "Pause",
    queue: "Queue",
    energy: "energy",
  };
</script>

<section class="ui-control-preview" aria-labelledby="ui-preview-title">
  <p>Preview</p>
  <h2 id="ui-preview-title">Energy and action controls</h2>

  <div class="ui-preview-energy glass-card">
    <strong>00:44</strong>
    <div class="ui-preview-energy-values">
      <span class="ui-preview-energy-mark" aria-hidden="true">
        {#if controls.energy.mode === "icon" && controls.energy.icon}
          <i class={controls.energy.icon}></i>
        {:else}
          energy
        {/if}
      </span>
      <strong>7.60 / 10.00</strong>
      <small>(-0.06/s, 01:44 remaining)</small>
    </div>
    <div class="ui-preview-energy-progress" role="progressbar" aria-label="Energy preview">
      <span></span>
    </div>
  </div>

  <div class="ui-preview-card glass-card">
    <div class="ui-preview-header">
      <span class="ui-preview-skill">◆</span>
      <strong>Example action</strong>
      {#each actionControls as control (control)}
        <span class="glass-control">
          {#if controls[control].mode === "icon" && controls[control].icon}
            <i class={controls[control].icon} aria-hidden="true"></i>
          {:else}
            {labels[control]}
          {/if}
        </span>
      {/each}
      <span class="ui-preview-duration">1.00s</span>
    </div>
    <p class="ui-preview-flavour">Action flavour appears here.</p>
    <div class="ui-preview-progress" role="progressbar" aria-label="Action progress preview">
      <span></span>
    </div>
  </div>
</section>
