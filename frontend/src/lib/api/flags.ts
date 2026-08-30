import { apiRequest } from "./client";

export type FlagValueType = "boolean" | "number" | "text";

export type FlagDefinition = {
  uuid: string;
  name: string;
  valueType: FlagValueType;
};

export type CreateFlagInput = Omit<FlagDefinition, "uuid">;

export function listFlags(projectUuid: string): Promise<FlagDefinition[]> {
  return apiRequest<FlagDefinition[]>(`/projects/${encodeURIComponent(projectUuid)}/flags`);
}

export function createFlag(
  projectUuid: string,
  input: CreateFlagInput,
): Promise<FlagDefinition> {
  return apiRequest<FlagDefinition>(`/projects/${encodeURIComponent(projectUuid)}/flags`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function updateFlag(
  projectUuid: string,
  flagUuid: string,
  input: CreateFlagInput,
): Promise<FlagDefinition> {
  const project = encodeURIComponent(projectUuid);
  const flag = encodeURIComponent(flagUuid);
  return apiRequest<FlagDefinition>(`/projects/${project}/flags/${flag}`, {
    method: "PUT",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}
