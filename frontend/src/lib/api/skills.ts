import { apiRequest } from "./client";

export type SkillDefinition = {
  uuid: string;
  name: string;
  icon: string;
};

export function listSkills(projectUuid: string): Promise<SkillDefinition[]> {
  return apiRequest<SkillDefinition[]>(`/projects/${encodeURIComponent(projectUuid)}/skills`);
}

export function createSkill(
  projectUuid: string,
  name: string,
  icon: string,
): Promise<SkillDefinition> {
  return apiRequest<SkillDefinition>(`/projects/${encodeURIComponent(projectUuid)}/skills`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ name, icon }),
  });
}

export function updateSkill(
  projectUuid: string,
  skillUuid: string,
  name: string,
  icon: string,
): Promise<SkillDefinition> {
  const projectPath = encodeURIComponent(projectUuid);
  const skillPath = encodeURIComponent(skillUuid);
  return apiRequest<SkillDefinition>(`/projects/${projectPath}/skills/${skillPath}`, {
    method: "PUT",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ name, icon }),
  });
}
