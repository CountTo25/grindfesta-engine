<script lang="ts">
  import { glassGlow } from "../runtime/glassGlow";

  export let className = "";
  export let accent: string | null = null;
  export let glowEnabled = true;
  export let glowRadius = 112;
</script>

<div
  use:glassGlow={{ enabled: glowEnabled, radius: glowRadius }}
  class="glass-root {className}"
  style={accent ? `--ui-accent: ${accent}` : undefined}
>
  <slot />
</div>

<style>
  .glass-root {
    min-height: 100%;
    background:
      radial-gradient(circle at 14% 8%, rgb(from var(--ui-accent) r g b / 13%), transparent 34rem),
      radial-gradient(circle at 92% 76%, rgb(from var(--ui-accent) r g b / 7%), transparent 28rem),
      linear-gradient(145deg, var(--ui-page-soft), var(--ui-page));
  }
</style>
