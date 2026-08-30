2026-08-22 15:54:49 JST

# Skills editor

## Accepted behavior

- Each project owns an ordered `skills.json` array.
- Skill definitions contain a stable UUID, name, and icon class string.
- Legacy skill definitions receive and persist UUIDs when loaded.
- Authors can create, rename, and assign icons to skills.
- Project-scoped icon libraries accept a stylesheet URL or uploaded CSS and cache discovered classes.
- Skills are a top-level editor section selected from the top toolbar.
- The Skills workspace does not repeat the section title inside its content area.

## Team preferences

- Keep editor section navigation in the top toolbar, not in a side navigation rail.
- Follow language-standard naming conventions instead of enforcing underscore-separated names.
- Primary save actions stay muted until their required input is present.
- Prefix inputs should start empty and accept common CSS notation such as `fa-`.

## Future feature debt

- Add skill deletion and reordering.
- Improve icon-family/style metadata beyond CSS selector discovery.
- Connect skill definitions to the future compiler and generated Svelte game code.
