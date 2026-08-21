const rootDir = import.meta.dir;
const backendDir = `${rootDir}/backend`;
const frontendDir = `${rootDir}/frontend`;

const initialEnv = new Set(Object.keys(process.env));
const envFiles = [
  `${rootDir}/.env`,
  `${rootDir}/.env.local`,
  `${backendDir}/.env`,
  `${backendDir}/.env.local`,
  `${frontendDir}/.env`,
  `${frontendDir}/.env.local`,
];

function usage() {
  console.log(`Usage: bun down.ts

Stops local stack listeners using API_PORT and SVELTE_PORT.
Defaults:
  API_PORT=9002
  SVELTE_PORT=5173`);
}

function parseEnvValue(raw: string): string {
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

async function loadEnvFiles() {
  for (const path of envFiles) {
    const file = Bun.file(path);

    if (!(await file.exists())) {
      continue;
    }

    const text = await file.text();
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) {
        continue;
      }

      const [, key, rawValue] = match;
      if (initialEnv.has(key)) {
        continue;
      }

      process.env[key] = parseEnvValue(rawValue);
    }
  }
}

function readPort(name: "API_PORT" | "SVELTE_PORT", fallback: number): number {
  const value = process.env[name] ?? String(fallback);
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a valid TCP port; received "${value}"`);
  }

  process.env[name] = String(port);
  return port;
}

async function runCapture(command: string[]) {
  const proc = Bun.spawn(command, {
    cwd: rootDir,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode };
}

async function listeningPids(port: number): Promise<number[]> {
  const { stdout } = await runCapture([
    "lsof",
    `-tiTCP:${port}`,
    "-sTCP:LISTEN",
  ]).catch(() => ({ stdout: "" }));

  return Array.from(
    new Set(
      stdout
        .split(/\s+/)
        .map((pid) => Number(pid))
        .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid),
    ),
  );
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function killPid(pid: number, signal: NodeJS.Signals) {
  try {
    process.kill(pid, signal);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== "ESRCH") {
      throw error;
    }
  }
}

async function waitForPort(port: number, attempts: number) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await sleep(100);
    if ((await listeningPids(port)).length === 0) {
      return true;
    }
  }

  return (await listeningPids(port)).length === 0;
}

async function stopPort(port: number, label: string) {
  const pids = await listeningPids(port);

  if (pids.length === 0) {
    console.log(`No ${label} listener on port ${port}`);
    return;
  }

  console.log(`Stopping ${label} listener on port ${port}: ${pids.join(", ")}`);
  for (const pid of pids) {
    killPid(pid, "SIGTERM");
  }

  if (await waitForPort(port, 20)) {
    return;
  }

  const remaining = await listeningPids(port);
  console.log(`Force stopping ${label} listener on port ${port}: ${remaining.join(", ")}`);
  for (const pid of remaining) {
    killPid(pid, "SIGKILL");
  }

  if (!(await waitForPort(port, 10))) {
    throw new Error(`${label} listener is still running on port ${port}`);
  }
}

const args = process.argv.slice(2);

if (args.length > 0) {
  if (args.length === 1 && (args[0] === "-h" || args[0] === "--help")) {
    usage();
    process.exit(0);
  }

  usage();
  process.exit(1);
}

await loadEnvFiles();

const apiPort = readPort("API_PORT", 9002);
const sveltePort = readPort("SVELTE_PORT", 5173);

await stopPort(sveltePort, "Svelte");
await stopPort(apiPort, "Rust API");

console.log("Stack listeners stopped");
