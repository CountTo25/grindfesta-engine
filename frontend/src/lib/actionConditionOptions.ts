import type {
  ActionCondition,
  ActionConditionType,
  ActionDefinition,
} from "./api/actions";
import type { FlagDefinition } from "./api/flags";
import type { ItemDefinition } from "./api/items";
import type { LocationDefinition } from "./api/locations";
import type { GlassOption } from "./components/types";

export type ConditionSources = {
  locations: LocationDefinition[];
  actions: ActionDefinition[];
  items: ItemDefinition[];
  flags: FlagDefinition[];
};

export function buildConditionOptions(sources: ConditionSources): GlassOption[] {
  const options: GlassOption[] = [];
  if (sources.locations.length) options.push({ value: "location", label: "Location" });
  if (sources.actions.length) {
    options.push(
      { value: "actionDoneThisRun", label: "Action done this run" },
      { value: "actionDoneHistorically", label: "Action done historically" },
    );
  }
  if (sources.items.length) options.push({ value: "hasItem", label: "Has item" });
  if (sources.flags.length) options.push({ value: "hasFlag", label: "Has flag" });
  if (sources.flags.some((flag) => flag.valueType === "text")) {
    options.push({ value: "flagEquals", label: "Flag equals" });
  }
  if (sources.flags.some((flag) => flag.valueType === "number")) {
    options.push(
      { value: "flagAtLeast", label: "Flag at least" },
      { value: "flagAtMost", label: "Flag at most" },
    );
  }
  options.push({ value: "custom", label: "Custom field" });
  return options;
}

export function targetOptions(type: ActionConditionType, sources: ConditionSources) {
  if (type === "custom") return [];
  if (type === "location") {
    return sources.locations.map(({ uuid, title }) => ({ value: uuid, label: title }));
  }
  if (type === "hasItem") {
    return sources.items.map(({ uuid, name }) => ({ value: uuid, label: name }));
  }
  if (type.startsWith("flag") || type === "hasFlag") {
    const requiredType = type === "flagEquals" ? "text"
      : type === "flagAtLeast" || type === "flagAtMost" ? "number" : null;
    return sources.flags
      .filter((flag) => requiredType === null || flag.valueType === requiredType)
      .map(({ uuid, name }) => ({ value: uuid, label: name }));
  }
  return sources.actions.map(({ uuid, title }) => ({ value: uuid, label: title }));
}

export function defaultCondition(
  condition: ActionConditionType,
  value: string,
): ActionCondition {
  return {
    condition,
    value,
    not: false,
    amount: condition === "hasItem" ? 1
      : condition === "flagAtLeast" || condition === "flagAtMost" ? 0 : undefined,
    comparisonValue: condition === "flagEquals" ? "" : undefined,
    check: condition === "custom" ? { operator: "=", value: "" } : undefined,
  };
}
