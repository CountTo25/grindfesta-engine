# Glass library

Import `styles/ui.css` once, then mount the reflection action on the app shell.

```svelte
<script lang="ts">
  import { Glass_surface, glass_reflections } from "./lib";
  import "./lib/styles/ui.css";
</script>

<main use:glass_reflections>
  <Glass_surface tag="section">Content</Glass_surface>
</main>
```

`glass_reflections` watches the shell for surfaces added later. It paints one
small canvas around the pointer instead of attaching a full-screen effect to
every surface. Transformed and clipped elements, surface accent colors, nested
menus, scroll fades, coarse pointers, and accessibility preferences are handled
by the shared controller.

## Components

- `Glass_surface` supports `surface`, `card`, and `menu` variants.
- `interactive` adds hover, keyboard focus, and pressed motion.
- `accent="194 65 45"` overrides `--ui_accent` for one surface.
- Menus occlude reflections behind them automatically. Use `occludes` to
  override this or `data-glass-occluder` on custom markup.
- `Glass_button` includes selected, primary, danger, standalone, and icon-only
  treatments.
- `Scroll_fade` provides a framed scroller with reflected fade edges. The
  `glass_scroll_fade` action is also exported for custom markup.

```svelte
<Glass_surface variant="card" interactive tabindex={0}>
  Reusable interactive card
</Glass_surface>

<Scroll_fade frame_class="list_frame" scroller_class="list">
  <!-- scrolling content -->
</Scroll_fade>
```

## Preferences and custom setup

`set_glass_reflections_enabled(false)` removes the pointer reflection and adds
the low-effects `no_glass` class to the action root. The preference is persisted
locally and exposed as the readable `glass_reflections_enabled` store.

For non-Svelte roots or custom selectors, use `init_glass_reflections`:

```ts
const destroy = init_glass_reflections({
  root: document,
  selector: ".my_glass",
  occluder_selector: ".my_menu",
  glow_radius: 140,
});
```

Call `destroy()` when the app unmounts. `enabled` can be any Svelte readable
boolean store.

## CSS hooks

The main tokens are `--ui_accent` as space-separated RGB channels,
`--ui_surface`, `--ui_surface_strong`, `--ui_filter`, `--ui_stroke`, and the
three radius tokens. Per-surface hooks include `--glass_surface_tint`,
`--glass_edge_color`, `--glass_highlight_alpha`, and
`--glass_highlight_stop`.

Reusable classes include `interactive_glass`, `glass_backdrop`,
`glass_hover_veil`, `glass_icon`, `glass_icon_glow`, `glass_scroll`, and
`scroll_fade_frame`. The CSS includes opaque fallbacks for missing
`backdrop-filter`, Firefox scroll-fade overlays, reduced transparency/high
contrast behavior, and reduced-motion behavior.
