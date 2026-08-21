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

async function freePort(port: number, label: string) {
  const pids = await listeningPids(port);

  if (pids.length === 0) {
    return;
  }

  console.log(`Stopping existing ${label} listener on port ${port}: ${pids.join(", ")}`);
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "ESRCH") {
        throw error;
      }
    }
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await sleep(100);
    if ((await listeningPids(port)).length === 0) {
      return;
    }
  }

  const remaining = await listeningPids(port);
  if (remaining.length === 0) {
    return;
  }

  console.log(`Force stopping ${label} listener on port ${port}: ${remaining.join(", ")}`);
  for (const pid of remaining) {
    try {
      process.kill(pid, "SIGKILL");
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "ESRCH") {
        throw error;
      }
    }
  }
}

function spawnProcess(label: string, command: string[], cwd: string, env: Bun.Env) {
  console.log(`Starting ${label}: ${command.join(" ")}`);
  return Bun.spawn(command, {
    cwd,
    env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
}

await loadEnvFiles();

const apiPort = readPort("API_PORT", 9002);
const sveltePort = readPort("SVELTE_PORT", 5173);
const svelteOrigin = `http://localhost:${sveltePort}`;
const env = {
  ...process.env,
  API_PORT: String(apiPort),
  SVELTE_PORT: String(sveltePort),
  NATIVE_DEV_CORS: process.env.NATIVE_DEV_CORS ?? svelteOrigin,
};

await freePort(apiPort, "Rust API");
await freePort(sveltePort, "Svelte");

const backend = spawnProcess("Rust API", ["cargo", "run", "-p", "main"], backendDir, env);
const frontend = spawnProcess(
  "Svelte",
  ["bun", "run", "dev", "--", "--host", "localhost", "--port", String(sveltePort), "--strictPort"],
  frontendDir,
  env,
);

console.log(`API_PORT=${apiPort}`);
console.log(`SVELTE_PORT=${sveltePort}`);
console.log(`Svelte: ${svelteOrigin}`);

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals | "EXIT") {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`\nStopping stack (${signal})`);

  for (const proc of [frontend, backend]) {
    try {
      proc.kill("SIGTERM");
    } catch {
      // Process already exited.
    }
  }

  await Promise.race([Promise.allSettled([frontend.exited, backend.exited]), sleep(3000)]);

  for (const proc of [frontend, backend]) {
    try {
      proc.kill("SIGKILL");
    } catch {
      // Process already exited.
    }
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    shutdown(signal).finally(() => process.exit(0));
  });
}

const [label, exitCode] = await Promise.race([
  backend.exited.then((code) => ["Rust API", code] as const),
  frontend.exited.then((code) => ["Svelte", code] as const),
]);

if (!shuttingDown) {
  console.error(`${label} exited with code ${exitCode}`);
  await shutdown("EXIT");
  process.exit(exitCode ?? 1);
}
