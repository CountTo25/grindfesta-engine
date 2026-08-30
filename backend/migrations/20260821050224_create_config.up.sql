-- Add up migration script here
CREATE TABLE config (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL CHECK (json_valid(value)),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO config (key, value)
VALUES (
    'dependencies',
    '[{"name":"Bun","command":"bun","check_arguments":["--version"],"install_url":"https://bun.com/docs/installation"}]'
);
