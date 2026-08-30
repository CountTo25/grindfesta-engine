import { apiRequest } from "./client";

export type Project = {
  uuid: string;
  schemaVersion: number;
  name: string;
  description: string;
  engineVariables: EngineVariables;
  ui: {
    componentSet: string;
    controls: UiControls;
    variables: UiThemeVariables;
  };
};

export type EngineVariables = {
  baseEnergyCapacity: number;
  initialEnergyDecayRate: number;
  energyDecayDoublingSeconds: number;
  energyDrainMultiplier: number;
  ticksPerSecond: number;
  baseActionProgressPerSecond: number;
  runSkillBaseExperience: number;
  runSkillExperienceGrowth: number;
  runSkillLevelModifier: number;
  persistentSkillBaseExperience: number;
  persistentSkillExperienceGrowth: number;
  persistentSkillLevelModifier: number;
};

export type UiThemeVariables = Record<string, string>;

export type UiControlMode = "text" | "icon";

export type UiControl = {
  mode: UiControlMode;
  icon: string;
};

export type UiControls = {
  play: UiControl;
  pause: UiControl;
  queue: UiControl;
  energy: UiControl;
};

export type NewProject = {
  name: string;
  description: string;
  uiComponent: string;
};

export type CompiledProject = {
  projectUuid: string;
  outputPath: string;
  entryPath: string;
  launchPath: string;
};

export function listProjects(): Promise<Project[]> {
  return apiRequest<Project[]>("/projects");
}

export function createProject(project: NewProject): Promise<Project> {
  return apiRequest<Project>("/projects", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(project),
  });
}

export function compileProject(projectUuid: string): Promise<CompiledProject> {
  return apiRequest<CompiledProject>(
    `/projects/${encodeURIComponent(projectUuid)}/compile`,
    { method: "POST" },
  );
}

export function updateProjectUi(
  projectUuid: string,
  controls: UiControls,
  variables: UiThemeVariables,
): Promise<Project> {
  return apiRequest<Project>(`/projects/${encodeURIComponent(projectUuid)}/ui`, {
    method: "PUT",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ controls, variables }),
  });
}

export function updateEngineVariables(
  projectUuid: string,
  variables: EngineVariables,
): Promise<Project> {
  return apiRequest<Project>(
    `/projects/${encodeURIComponent(projectUuid)}/engine-variables`,
    {
      method: "PUT",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(variables),
    },
  );
}
