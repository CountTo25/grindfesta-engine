CREATE TABLE icon_libraries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_uuid TEXT NOT NULL,
    name TEXT NOT NULL,
    source_url TEXT,
    css_content TEXT,
    prefix TEXT NOT NULL DEFAULT '',
    style_class TEXT NOT NULL DEFAULT '',
    icons TEXT NOT NULL CHECK (json_valid(icons)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((source_url IS NOT NULL) <> (css_content IS NOT NULL))
);

CREATE INDEX icon_libraries_project_uuid
ON icon_libraries (project_uuid);
