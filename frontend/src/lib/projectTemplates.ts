import glassSchema from "../../../template/glass/schema.json";

export type UiThemeVariableDefinition = {
  name: string;
  value: string;
  flavour: string;
};

export type UiComponentTemplate = {
  value: string;
  label: string;
  description: string;
  variables: Record<string, UiThemeVariableDefinition>;
};

export const uiComponentTemplates: UiComponentTemplate[] = [
  {
    value: "glass",
    label: glassSchema.name,
    description: glassSchema.description,
    variables: glassSchema.variables,
  },
];

export function getUiComponentTemplate(componentSet: string) {
  return uiComponentTemplates.find((template) => template.value === componentSet);
}

export function hexToRgbChannels(value: string | undefined) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value ?? "");
  return match
    ? match.slice(1).map((channel) => Number.parseInt(channel, 16)).join(" ")
    : undefined;
}
