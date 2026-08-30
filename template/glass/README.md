# Grindfesta glass

This directory is a self-contained Svelte UI template for an action-loop game.
It includes the glass tokens, pointer-following glow, responsive shell, panels,
action cards, progress bars, status cards, scrolling, and controls.

Import from the template entry point so its stylesheet is included:

```svelte
<script lang="ts">
  import {
    ActionCard,
    GameShell,
    GlassIconButton,
    GlassPanel,
    GlassRoot,
  } from "./template/glass";
</script>

<GlassRoot>
  <GameShell title="Game title" location="Location">
    <GlassPanel title="Actions">
      <ActionCard title="Action" progress={35} duration="3.20s">
        <span slot="icon">◆</span>
        <GlassIconButton slot="controls" ariaLabel="Start">▶</GlassIconButton>
      </ActionCard>
    </GlassPanel>
  </GameShell>
</GlassRoot>
```

`GlassRoot` enables the pointer-following illumination. Set `glowEnabled={false}`
for a lower-cost mode. Operating-system reduced-transparency and increased-
contrast preferences disable the glow automatically.

`Preview.svelte` assembles every major primitive into a neutral game shell and
can be mounted directly while building an editor preview.
