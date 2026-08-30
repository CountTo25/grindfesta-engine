<script lang="ts">
  export let percent = 0;
  export let tone: "accent" | "secondary" | "energy" = "accent";
  export let label = "Progress";

  $: clampedPercent = Math.max(0, Math.min(100, percent));
</script>

<div
  class="glass-progress"
  role="progressbar"
  aria-label={label}
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuenow={Math.round(clampedPercent)}
>
  <div
    class="glass-progress-fill"
    data-tone={tone}
    style={`transform: scaleX(${clampedPercent / 100})`}
  ></div>
</div>

<style>
  .glass-progress {
    width: 100%;
    height: 6px;
    overflow: hidden;
    border-top: 1px solid rgb(255 255 255 / 7%);
    background: rgb(0 0 0 / 30%);
    box-shadow: inset 0 1px 3px rgb(0 0 0 / 40%);
  }

  .glass-progress-fill {
    --progress-color: var(--ui-accent);
    width: 100%;
    height: 100%;
    transform-origin: left center;
    background:
      linear-gradient(90deg, rgb(255 255 255 / 4%), rgb(255 255 255 / 18%)),
      rgb(from var(--progress-color) r g b / 76%);
    box-shadow:
      0 0 12px rgb(from var(--progress-color) r g b / 45%),
      inset 0 1px 0 rgb(255 255 255 / 34%);
    transition: transform 180ms ease-out;
  }

  .glass-progress-fill[data-tone="secondary"] {
    --progress-color: var(--ui-progress-secondary);
  }

  .glass-progress-fill[data-tone="energy"] {
    --progress-color: var(--ui-accent);
  }

  @media (prefers-reduced-motion: reduce) {
    .glass-progress-fill {
      transition: none;
    }
  }
</style>
