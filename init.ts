import { access, mkdir, rm } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";

const rootDir = import.meta.dir;
const parentDir = dirname(rootDir);
const sourceName = basename(rootDir);

function usage() {
  console.log(`Usage: bun init.ts <target-folder>

Creates a new Git repository from ${sourceName}.
Relative target paths are created next to ${sourceName}.

Example:
  bun init.ts tgwork`);
}

function fail(message: string): never {
  console.error(message);
  console.error("");
  usage();
  process.exit(1);
}

function isInside(path: string, parent: string) {
  const offset = relative(parent, path);
  return offset === "" || (!offset.startsWith("..") && !isAbsolute(offset));
}

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function run(command: string[], cwd: string) {
  console.log(`$ ${command.join(" ")}`);
  const proc = Bun.spawn(command, {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`${command[0]} exited with ${exitCode}`);
  }
}

async function capture(command: string[], cwd: string) {
  const proc = Bun.spawn(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ]);

  if (exitCode !== 0) {
    return "";
  }

  return stdout.trim();
}

const args = process.argv.slice(2);

if (args.length !== 1 || args[0] === "-h" || args[0] === "--help") {
  usage();
  process.exit(args.length === 1 ? 0 : 1);
}

const targetArg = args[0].trim();

if (!targetArg || targetArg === "." || targetArg === "..") {
  fail("Provide a target folder name.");
}

const targetDir = isAbsolute(targetArg) ? resolve(targetArg) : resolve(parentDir, targetArg);

if (isInside(targetDir, rootDir)) {
  fail("Target folder must be outside the source repository.");
}

if (await exists(targetDir)) {
  fail(`Target already exists: ${targetDir}`);
}

const status = await capture(["git", "status", "--short"], rootDir);
if (status) {
  console.warn("Warning: source has uncommitted changes; git clone will copy committed Git state only.");
}

const sourceBranch = await capture(["git", "branch", "--show-current"], rootDir);
const initCommand = sourceBranch ? ["git", "init", "-b", sourceBranch] : ["git", "init"];

await mkdir(dirname(targetDir), { recursive: true });
await run(["git", "clone", "--no-hardlinks", rootDir, targetDir], parentDir);
await rm(join(targetDir, ".git"), { recursive: true, force: true });
await run(initCommand, targetDir);

console.log("");
console.log(`Created new repository: ${targetDir}`);
