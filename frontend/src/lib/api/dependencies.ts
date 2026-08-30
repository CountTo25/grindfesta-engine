import { apiRequest } from "./client";

export type DependencyStatus = {
  name: string;
  command: string;
  installed: boolean;
  version: string | null;
  installUrl: string;
};

export type DependencyReport = {
  allInstalled: boolean;
  dependencies: DependencyStatus[];
};

export async function loadDependencies(): Promise<DependencyReport> {
  return apiRequest<DependencyReport>("/dependencies", {
    headers: { accept: "application/json" },
  });
}
