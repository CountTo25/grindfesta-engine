import { load_env_files, read_port } from "./run_environment";

const rootDir = import.meta.dir;
const backendDir = `${rootDir}/backend`;
const frontendDir = `${rootDir}/frontend`;

const envFiles = [
  `${rootDir}/.env`,
  `${rootDir}/.env.local`,
  `${backendDir}/.env`,
  `${backendDir}/.env.local`,
  `${frontendDir}/.env`,
  `${frontendDir}/.env.local`,
];

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

await load_env_files(envFiles);

const apiPort = read_port("API_PORT", 9002);
const sveltePort = read_port("SVELTE_PORT", 5173);
const svelteOrigin = `http://localhost:${sveltePort}`;
const env = {
  ...process.env,
  API_PORT: String(apiPort),
  SVELTE_PORT: String(sveltePort),
  NATIVE_DEV_CORS: process.env.NATIVE_DEV_CORS ?? svelteOrigin,
  VITE_API_ORIGIN: process.env.VITE_API_ORIGIN ?? `http://localhost:${apiPort}`,
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
