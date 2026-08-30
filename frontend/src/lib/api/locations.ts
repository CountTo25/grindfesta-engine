import { apiRequest } from "./client";

export type LocationDefinition = {
  uuid: string;
  title: string;
  flavour: string;
};

export type CreateLocationInput = Omit<LocationDefinition, "uuid">;

export function listLocations(projectUuid: string): Promise<LocationDefinition[]> {
  return apiRequest<LocationDefinition[]>(
    `/projects/${encodeURIComponent(projectUuid)}/locations`,
  );
}

export function createLocation(
  projectUuid: string,
  input: CreateLocationInput,
): Promise<LocationDefinition> {
  return apiRequest<LocationDefinition>(
    `/projects/${encodeURIComponent(projectUuid)}/locations`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
}

export function updateLocation(
  projectUuid: string,
  locationUuid: string,
  input: CreateLocationInput,
): Promise<LocationDefinition> {
  const project = encodeURIComponent(projectUuid);
  const location = encodeURIComponent(locationUuid);
  return apiRequest<LocationDefinition>(`/projects/${project}/locations/${location}`, {
    method: "PUT",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}
