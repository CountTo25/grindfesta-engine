import { socketUrl } from "./client";
import { compileProject, type CompiledProject } from "./projects";

export type BuildEventStatus = "running" | "completed" | "failed";

export type BuildEvent = {
  stage: string;
  status: BuildEventStatus;
  message: string;
};

export type BuildStep = {
  id: string;
  label: string;
  status: BuildEventStatus | "pending";
  message: string;
};

export async function compileWithProgress(
  projectUuid: string,
  onEvent: (event: BuildEvent) => void,
): Promise<CompiledProject> {
  const socket = await connect(projectUuid, onEvent);
  try {
    return await compileProject(projectUuid);
  } finally {
    socket.close();
  }
}

function connect(
  projectUuid: string,
  onEvent: (event: BuildEvent) => void,
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(
      socketUrl(`/projects/${encodeURIComponent(projectUuid)}/build-events`),
    );
    const timeout = window.setTimeout(() => {
      socket.close();
      reject(new Error("Build progress connection timed out."));
    }, 5000);
    let connected = false;

    socket.onmessage = (message) => {
      const event = parseEvent(message.data);
      if (!event) return;
      if (event.stage === "server" && event.message === "connected") {
        connected = true;
        window.clearTimeout(timeout);
        resolve(socket);
        return;
      }
      onEvent(event);
    };
    socket.onerror = () => {
      if (!connected) {
        window.clearTimeout(timeout);
        reject(new Error("Build progress connection failed."));
      }
    };
    socket.onclose = () => {
      if (!connected) {
        window.clearTimeout(timeout);
        reject(new Error("Build progress connection closed."));
      }
    };
  });
}

function parseEvent(value: unknown): BuildEvent | null {
  try {
    const event = JSON.parse(String(value));
    if (event?.channel === "server") {
      return { stage: "server", status: "completed", message: event.message };
    }
    if (typeof event?.stage !== "string" || typeof event?.message !== "string") {
      return null;
    }
    return event as BuildEvent;
  } catch {
    return null;
  }
}
