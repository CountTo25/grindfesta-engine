import { derived, writable, type Readable } from "svelte/store";

export type TickContext = {
  tickMs: number;
  tickNumber: number;
  burstIndex: number;
};

export type TickLoopOptions = {
  ticksPerSecond: Readable<number>;
  timeScale: Readable<number>;
  onTick: (context: TickContext) => void;
  hasWork?: () => boolean;
  autoStart?: boolean;
};

export type TickLoop = {
  running: Readable<boolean>;
  tickCount: Readable<number>;
  tickMs: Readable<number>;
  start: () => void;
  stop: () => void;
  destroy: () => void;
};

type TickSettings = {
  tickMs: number;
  timeScale: number;
};

function validateTicksPerSecond(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError("ticksPerSecond must be a finite number above zero");
  }
  return value;
}

function validateTimeScale(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError("timeScale must be a positive safe integer");
  }
  return value;
}

function asReadable<T>(store: Readable<T>): Readable<T> {
  return { subscribe: store.subscribe };
}

export function createTickLoop(options: TickLoopOptions): TickLoop {
  const runningStore = writable(false);
  const tickCountStore = writable(0);
  const tickMsStore = writable(0);
  const hasWork = options.hasWork ?? (() => true);
  let settings: TickSettings = { tickMs: 0, timeScale: 1 };
  let tickNumber = 0;
  let running = false;
  let destroyed = false;
  let timer: ReturnType<typeof globalThis.setInterval> | undefined;

  const runBurst = () => {
    const burstSize = settings.timeScale;
    for (let burstIndex = 0; burstIndex < burstSize; burstIndex += 1) {
      if (!running || !hasWork()) break;
      tickNumber += 1;
      options.onTick({
        tickMs: settings.tickMs,
        tickNumber,
        burstIndex,
      });
      tickCountStore.set(tickNumber);
    }
  };

  const clearTimer = () => {
    if (timer === undefined) return;
    globalThis.clearInterval(timer);
    timer = undefined;
  };

  const schedule = () => {
    clearTimer();
    timer = globalThis.setInterval(runBurst, settings.tickMs);
  };

  const settingsStore = derived(
    [options.ticksPerSecond, options.timeScale],
    ([ticksPerSecond, timeScale]): TickSettings => ({
      tickMs: 1000 / validateTicksPerSecond(ticksPerSecond),
      timeScale: validateTimeScale(timeScale),
    }),
  );
  const unsubscribeSettings = settingsStore.subscribe((nextSettings) => {
    settings = nextSettings;
    tickMsStore.set(settings.tickMs);
    if (running) schedule();
  });

  const start = () => {
    if (destroyed) throw new Error("Cannot start a destroyed tick loop");
    if (running) return;
    running = true;
    runningStore.set(true);
    schedule();
  };

  const stop = () => {
    if (!running) return;
    running = false;
    runningStore.set(false);
    clearTimer();
  };

  const destroy = () => {
    if (destroyed) return;
    stop();
    unsubscribeSettings();
    destroyed = true;
  };

  if (options.autoStart ?? true) start();
  return {
    running: asReadable(runningStore),
    tickCount: asReadable(tickCountStore),
    tickMs: asReadable(tickMsStore),
    start,
    stop,
    destroy,
  };
}
