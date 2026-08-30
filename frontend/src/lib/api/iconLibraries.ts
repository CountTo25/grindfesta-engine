import { apiRequest } from "./client";

export type IconLibrary = {
  id: number;
  projectUuid: string;
  name: string;
  sourceUrl: string | null;
  cssContent: string | null;
  prefix: string;
  styleClass: string;
  icons: string[];
};

export type CreateIconLibraryInput = {
  sourceUrl?: string;
  cssContent?: string;
  fileName?: string;
  prefix: string;
};

export function listIconLibraries(projectUuid: string): Promise<IconLibrary[]> {
  return apiRequest<IconLibrary[]>(
    `/projects/${encodeURIComponent(projectUuid)}/icon-libraries`,
  );
}

export function createIconLibrary(
  projectUuid: string,
  input: CreateIconLibraryInput,
): Promise<IconLibrary> {
  return apiRequest<IconLibrary>(
    `/projects/${encodeURIComponent(projectUuid)}/icon-libraries`,
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
