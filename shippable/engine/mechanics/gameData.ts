export type GameDataScalar = boolean | number | string | null;
export type GameDataOperator = "=" | "<=" | ">=";
export type GameDataNumberOperation = "add" | "subtract";

const pathToken = /\.([A-Za-z_$][\w$]*)|\[(\d+|"(?:\\.|[^"\\])*")\]/gy;
const blockedKeys = new Set(["__proto__", "prototype", "constructor"]);

export function readGameDataField(state: unknown, path: string): unknown {
  if (path === "$") return state;
  const keys = parseGameDataPath(path);
  if (!keys) return undefined;
  let current = state;
  for (const key of keys) {
    if (current === null || typeof current !== "object") return undefined;
    if (!Object.hasOwn(current, key)) return undefined;
    current = (current as Record<PropertyKey, unknown>)[key];
  }
  return current;
}

export function changeGameDataNumber<State>(
  state: State,
  path: string,
  operation: GameDataNumberOperation,
  amount: number,
): State {
  const keys = parseGameDataPath(path);
  if (!keys?.length || !Number.isFinite(amount) || amount <= 0) return state;
  let parent: unknown = state;
  for (const key of keys.slice(0, -1)) {
    if (parent === null || typeof parent !== "object" || !Object.hasOwn(parent, key)) return state;
    parent = (parent as Record<PropertyKey, unknown>)[key];
  }
  const key = keys.at(-1)!;
  if (parent === null || typeof parent !== "object" || !Object.hasOwn(parent, key)) return state;
  const record = parent as Record<PropertyKey, unknown>;
  const current = record[key];
  if (typeof current !== "number" || !Number.isFinite(current)) return state;
  const next = operation === "add" ? current + amount : current - amount;
  if (Number.isFinite(next)) record[key] = next;
  return state;
}

export function compareGameData(
  state: unknown,
  path: string,
  operator: GameDataOperator,
  expected: GameDataScalar,
) {
  const actual = readGameDataField(state, path);
  if (operator === "=") return actual === expected;
  if (typeof actual !== typeof expected) return false;
  if (typeof actual === "number" && typeof expected === "number") {
    return operator === "<=" ? actual <= expected : actual >= expected;
  }
  if (typeof actual === "string" && typeof expected === "string") {
    return operator === "<=" ? actual <= expected : actual >= expected;
  }
  return false;
}

function parseBracketKey(token: string | undefined): string | number | undefined {
  if (!token) return undefined;
  if (token.startsWith('"')) {
    try {
      return JSON.parse(token) as string;
    } catch {
      return undefined;
    }
  }
  const index = Number(token);
  return Number.isSafeInteger(index) && index >= 0 ? index : undefined;
}

function parseGameDataPath(path: string): Array<string | number> | undefined {
  if (!path.startsWith("$")) return undefined;
  const keys: Array<string | number> = [];
  let index = 1;
  while (index < path.length) {
    pathToken.lastIndex = index;
    const match = pathToken.exec(path);
    if (!match || match.index !== index) return undefined;
    const key = match[1] ?? parseBracketKey(match[2]);
    if (key === undefined || blockedKeys.has(String(key))) return undefined;
    keys.push(key);
    index = pathToken.lastIndex;
  }
  return keys;
}
