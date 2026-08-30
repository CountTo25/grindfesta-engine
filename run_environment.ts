export type Port_name = "API_PORT" | "SVELTE_PORT";

function parse_env_value(raw: string): string {
  const trimmed = raw.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  const comment = trimmed.indexOf(" #");
  return comment >= 0 ? trimmed.slice(0, comment).trim() : trimmed;
}

export async function load_env_files(paths: string[]) {
  const initial_env = new Set(Object.keys(process.env));

  for (const path of paths) {
    const file = Bun.file(path);

    if (!(await file.exists())) {
      continue;
    }

    const contents = await file.text();
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) {
        continue;
      }

      const [, key, raw_value] = match;
      if (!initial_env.has(key)) {
        process.env[key] = parse_env_value(raw_value);
      }
    }
  }
}

export function read_port(name: Port_name, fallback: number): number {
  const value = process.env[name] ?? String(fallback);
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a valid TCP port; received "${value}"`);
  }

  process.env[name] = String(port);
  return port;
}
