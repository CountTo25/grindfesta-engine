import type { ActionEffectType } from "./api/actions";
import type { FlagDefinition } from "./api/flags";
import type { ItemDefinition } from "./api/items";
import type { LocationDefinition } from "./api/locations";
import type { GlassOption } from "./components/types";

export function buildEffectOptions(
  items: ItemDefinition[],
  flags: FlagDefinition[],
  locations: LocationDefinition[],
): GlassOption[] {
  const hasNumberFlag = flags.some((flag) => flag.valueType === "number");
  return [
    { value: "addLog", label: "Timeline entry" },
    { value: "changeLocation", label: "Change location", disabled: locations.length === 0 },
    { value: "restoreEnergy", label: "Restore energy" },
    { value: "spendEnergy", label: "Spend energy" },
    { value: "setEnergy", label: "Set energy" },
    { value: "cutDecay", label: "Divide energy drain" },
    { value: "addItem", label: "Add item", disabled: items.length === 0 },
    { value: "useItem", label: "Use item", disabled: items.length === 0 },
    { value: "setFlag", label: "Set flag", disabled: flags.length === 0 },
    { value: "increaseFlag", label: "Increase flag", disabled: !hasNumberFlag },
    { value: "decreaseFlag", label: "Decrease flag", disabled: !hasNumberFlag },
    { value: "clearFlag", label: "Clear flag", disabled: flags.length === 0 },
    { value: "custom", label: "Custom field" },
  ];
}

export function effectValueLabel(effect: ActionEffectType) {
  if (effect === "addLog") return "Timeline text";
  if (effect === "cutDecay") return "Factor";
  return "Amount";
}

export function isItemEffect(effect: ActionEffectType) {
  return effect === "addItem" || effect === "useItem";
}

export function isLocationEffect(effect: ActionEffectType) {
  return effect === "changeLocation";
}

export function isFlagEffect(effect: ActionEffectType) {
  return ["setFlag", "increaseFlag", "decreaseFlag", "clearFlag"].includes(effect);
}

export function flagOptions(effect: ActionEffectType, flags: FlagDefinition[]) {
  const available = effect === "increaseFlag" || effect === "decreaseFlag"
    ? flags.filter((flag) => flag.valueType === "number") : flags;
  return available.map((flag) => ({ value: flag.uuid, label: flag.name }));
}

export function flagFields(
  effect: ActionEffectType,
  uuid: string,
  flags: FlagDefinition[],
) {
  const flag = flags.find((candidate) => candidate.uuid === uuid);
  return {
    amount: effect === "increaseFlag" || effect === "decreaseFlag" ? 1
      : effect === "setFlag" && flag?.valueType === "number" ? 0 : undefined,
    flagValue: effect === "setFlag" && flag?.valueType === "text" ? "" : undefined,
  };
}
