import { apiRequest } from "./client";

export type ItemDefinition = {
  uuid: string;
  name: string;
  description: string;
  capacity: number | null;
  autoUse: ItemAutoUse | null;
};

export type ItemAutoUse = {
  cooldownMs: number;
  conditions: Array<{ condition: "energyMissing"; value: number }>;
  effects: Array<{ effect: "restoreEnergy"; value: number }>;
};

export type CreateItemInput = Omit<ItemDefinition, "uuid">;

export function listItems(projectUuid: string): Promise<ItemDefinition[]> {
  return apiRequest<ItemDefinition[]>(`/projects/${encodeURIComponent(projectUuid)}/items`);
}

export function createItem(
  projectUuid: string,
  input: CreateItemInput,
): Promise<ItemDefinition> {
  return apiRequest<ItemDefinition>(`/projects/${encodeURIComponent(projectUuid)}/items`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export function updateItem(
  projectUuid: string,
  itemUuid: string,
  input: CreateItemInput,
): Promise<ItemDefinition> {
  const project = encodeURIComponent(projectUuid);
  const item = encodeURIComponent(itemUuid);
  return apiRequest<ItemDefinition>(`/projects/${project}/items/${item}`, {
    method: "PUT",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}
