import type { ActionCondition, ActionEffect, ActionRevealCondition } from "./api/actions";
import type { FlagDefinition } from "./api/flags";
import type { ItemDefinition } from "./api/items";
import type { LocationDefinition } from "./api/locations";
import type { OverviewRule, OverviewRuleKind } from "./overviewTypes";

export type OverviewLookups = {
  actions: Map<string, string>;
  flags: Map<string, FlagDefinition>;
  items: Map<string, ItemDefinition>;
  locations: Map<string, LocationDefinition>;
};

export function conditionRule(
  condition: ActionCondition | ActionRevealCondition,
  lookups: OverviewLookups,
): OverviewRule {
  const kind = conditionKind(condition.condition);
  const target = conditionTarget(condition, lookups);
  return {
    kind,
    operation: condition.condition,
    targetId: condition.value,
    targetNodeId: kind === "location" ? `location:${condition.value}`
      : kind === "action" ? `action:${condition.value}` : undefined,
    resourceKey: resourceKey(kind, condition.value),
    label: "description" in condition ? condition.description : target,
    detail: conditionDetail(condition, target),
    negated: condition.not,
  };
}

export function effectRule(effect: ActionEffect, lookups: OverviewLookups): OverviewRule {
  const kind = effectKind(effect.effect);
  const target = effectTarget(effect, lookups);
  return {
    kind,
    operation: effect.effect,
    targetId: effect.value,
    targetNodeId: kind === "location" ? `location:${effect.value}` : undefined,
    resourceKey: resourceKey(kind, effect.value),
    label: target,
    detail: effectDetail(effect, target),
    negated: effect.effect === "clearFlag" || effect.effect === "useItem",
  };
}

function conditionKind(condition: ActionCondition["condition"]): OverviewRuleKind {
  if (condition === "location") return "location";
  if (condition.startsWith("action")) return "action";
  if (condition === "hasItem") return "item";
  if (condition.startsWith("flag") || condition === "hasFlag") return "flag";
  return "state";
}

function effectKind(effect: ActionEffect["effect"]): OverviewRuleKind {
  if (effect === "changeLocation") return "location";
  if (effect === "addItem" || effect === "useItem") return "item";
  if (effect.endsWith("Flag")) return "flag";
  if (effect === "addLog") return "timeline";
  if (effect === "custom") return "state";
  return "energy";
}

function conditionTarget(condition: ActionCondition, lookups: OverviewLookups) {
  if (condition.condition === "location") return lookups.locations.get(condition.value)?.title ?? condition.value;
  if (condition.condition.startsWith("action")) return lookups.actions.get(condition.value) ?? condition.value;
  if (condition.condition === "hasItem") return lookups.items.get(condition.value)?.name ?? condition.value;
  if (condition.condition.startsWith("flag") || condition.condition === "hasFlag") {
    return lookups.flags.get(condition.value)?.name ?? condition.value;
  }
  return condition.value;
}

function conditionDetail(condition: ActionCondition, target: string) {
  if (condition.condition === "hasItem") return `Has ${condition.amount ?? 1} × ${target}`;
  if (condition.condition === "flagEquals") return `Flag: ${target} = ${condition.comparisonValue ?? ""}`;
  if (condition.condition === "flagAtLeast") return `Flag: ${target} >= ${condition.amount ?? 0}`;
  if (condition.condition === "flagAtMost") return `Flag: ${target} <= ${condition.amount ?? 0}`;
  if (condition.condition === "custom") {
    const value = typeof condition.check?.value === "string"
      ? JSON.stringify(condition.check.value) : String(condition.check?.value);
    return `${target} ${condition.check?.operator ?? "="} ${value}`;
  }
  const prefix = condition.condition === "location" ? "Location"
    : condition.condition === "actionDoneThisRun" ? "Done this run"
      : condition.condition === "actionDoneHistorically" ? "Done historically"
        : condition.condition === "hasFlag" ? "Has flag" : condition.condition;
  return `${prefix}: ${target}`;
}

function effectTarget(effect: ActionEffect, lookups: OverviewLookups) {
  if (effect.effect === "changeLocation") return lookups.locations.get(effect.value)?.title ?? effect.value;
  if (effect.effect === "addItem" || effect.effect === "useItem") {
    return lookups.items.get(effect.value)?.name ?? effect.value;
  }
  if (effect.effect.endsWith("Flag")) return lookups.flags.get(effect.value)?.name ?? effect.value;
  return effect.value;
}

function effectDetail(effect: ActionEffect, target: string) {
  if (effect.effect === "addItem" || effect.effect === "useItem") {
    return `${readable(effect.effect)}: ${effect.amount ?? 1} × ${target}`;
  }
  if (effect.effect === "custom") {
    return `${readable(effect.operation ?? "add")} ${effect.operand ?? 0} to ${target}`;
  }
  if (effect.effect.endsWith("Flag")) return `${readable(effect.effect)}: ${target}`;
  return `${readable(effect.effect)}: ${target}`;
}

function resourceKey(kind: OverviewRuleKind, target: string) {
  return ["flag", "item", "state"].includes(kind) ? `${kind}:${target}` : undefined;
}

function readable(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").toLocaleLowerCase();
}
