# Glass library

Import `styles/ui.css` once, then mount the reflection action on the app shell.

```svelte
<script lang="ts">
  import { GlassSurface, glassReflections } from "./lib";
  import "./lib/styles/ui.css";
</script>

<main use:glassReflections>
  <GlassSurface tag="section">Content</GlassSurface>
</main>
```

`glassReflections` watches the shell for surfaces added later. It paints one
small canvas around the pointer instead of attaching a full-screen effect to
every surface. Transformed and clipped elements, surface accent colors, nested
menus, scroll fades, coarse pointers, and accessibility preferences are handled
by the shared controller.

## Components

- `GlassSurface` supports `surface`, `card`, and `menu` variants.
- `interactive` adds hover, keyboard focus, and pressed motion.
- `accent="194 65 45"` overrides `--ui-accent` for one surface.
- Menus occlude reflections behind them automatically. Use `occludes` to
  override this or `data-glass-occluder` on custom markup.
- `GlassButton` includes selected, primary, danger, standalone, and icon-only
  treatments.
- `ScrollFade` provides a framed scroller with reflected fade edges. The
  `glassScrollFade` action is also exported for custom markup.

```svelte
<GlassSurface variant="card" interactive tabindex={0}>
  Reusable interactive card
</GlassSurface>

<ScrollFade frameClass="list-frame" scrollerClass="list">
  <!-- scrolling content -->
</ScrollFade>
```

## Preferences and custom setup

`setGlassReflectionsEnabled(false)` removes the pointer reflection and adds
the low-effects `no-glass` class to the action root. The preference is persisted
locally and exposed as the readable `glassReflectionsEnabled` store.

For non-Svelte roots or custom selectors, use `initGlassReflections`:

```ts
const destroy = initGlassReflections({
  root: document,
  selector: ".my-glass",
  occluderSelector: ".my-menu",
  glowRadius: 140,
});
```

Call `destroy()` when the app unmounts. `enabled` can be any Svelte readable
boolean store.

## CSS hooks

The main tokens are `--ui-accent` as space-separated RGB channels,
`--ui-surface`, `--ui-surface-strong`, `--ui-filter`, `--ui-stroke`, and the
three radius tokens. Per-surface hooks include `--glass-surface-tint`,
`--glass-edge-color`, `--glass-highlight-alpha`, and
`--glass-highlight-stop`.

Reusable classes include `interactive-glass`, `glass-backdrop`,
`glass-hover-veil`, `glass-icon`, `glass-icon-glow`, `glass-scroll`, and
`scroll-fade-frame`. The CSS includes opaque fallbacks for missing
`backdrop-filter`, Firefox scroll-fade overlays, reduced transparency/high
contrast behavior, and reduced-motion behavior.
