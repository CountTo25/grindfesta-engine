2026-08-21 15:01:58 JST

# Project launcher

## Accepted behavior

- The main editor glass panel stays exactly 10px from every viewport edge.
- The centered project subpanel is glass, 60% wide, 220px tall, and split 50/50.
- Controls and empty-state copy are top-aligned inside their respective halves.
- Project action buttons form a full-width vertical stack with 24px padding and 8px gaps.
- Buttons are muted at rest and gain the emerald glow only on hover or keyboard focus.
- Projects live in `projects/` beside the running binary.
- A project directory is named after the validated project name and contains `project.json`.
- Root `template/` content is not copied during project creation yet.

## Team preferences

- Keep interface copy minimal and visually quiet.
- Preserve established layout layers when adjusting child alignment.
- Verify spacing and alignment as rendered, not only through stylesheet inspection.

## Future debt

- Add project listing and replace the static empty state when projects exist.
- Add an explicit open-project/editor context.
- Define project schema versioning before game-specific data is persisted.
- Add template copying only after the scaffold content and conflict behavior are defined.
