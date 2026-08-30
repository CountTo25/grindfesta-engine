2026-08-24 13:40:33 JST

- Locations are project-scoped and stored in `locations.json` as a UUID-keyed object.
- The current Locations editor is add-only with title and flavour fields.
- Locations navigation belongs between Skills and Actions in the project editor top bar.
- Existing projects may omit `locations.json`; the service treats that as empty and creates the file on first save.
- Editing, deletion, ordering, action relationships, and generated-engine wiring remain future work.
