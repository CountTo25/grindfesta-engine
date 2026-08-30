use std::fmt::Write;

use crate::custom_condition_codegen::generate_custom_condition;
use crate::custom_effect_codegen::generate_custom_effect;
use crate::flag_codegen::{generate_flag_condition, generate_flag_effect};
use crate::game_codegen::{GeneratedModule, json, module};
use crate::{
    ActionCondition, ActionDefinition, ActionEffect, ActionRevealCondition, FlagDefinition,
    ItemDefinition, ProjectError,
};

pub(crate) fn action_modules(
    actions: &[ActionDefinition],
    items: &[ItemDefinition],
    flags: &[FlagDefinition],
) -> Result<Vec<GeneratedModule>, ProjectError> {
    let mut modules = Vec::new();
    let mut index = String::from("import type { RuntimeAction } from \"../../game/types\";\n");
    for (position, action) in actions.iter().enumerate() {
        let alias = format!("action{position}");
        writeln!(index, "import {alias} from \"./{}\";", action.uuid).unwrap();
        modules.push(module(
            format!("actions/{}.ts", action.uuid),
            generate_action(action, items, flags)?,
        ));
    }
    index.push_str("\nexport const actions: Record<string, RuntimeAction> = {\n");
    for position in 0..actions.len() {
        writeln!(index, "  [action{position}.uuid]: action{position},").unwrap();
    }
    index.push_str("};\n");
    modules.push(module("actions/index.ts", index));
    Ok(modules)
}

fn generate_action(
    action: &ActionDefinition,
    items: &[ItemDefinition],
    flags: &[FlagDefinition],
) -> Result<String, ProjectError> {
    let uuid = json(&action.uuid.to_string())?;
    let title = json(&action.title)?;
    let flavour = json(&action.flavour)?;
    let skill = json(&action.required_skill.to_string())?;
    let conditions = generate_conditions(&action.condition_join, &action.conditions)?;
    let (reveal_conditions, reveal_explanations) = generate_reveals(&action.reveal_conditions)?;
    let effects = generate_effects(&action.completion_effects, items, flags)?;
    let movement_destination = action
        .completion_effects
        .iter()
        .find(|effect| effect.effect == "changeLocation")
        .map(|effect| effect.value.as_str());
    let movement_destination = json(&movement_destination)?;
    let mut output = String::from(
        "import { allConditions, anyConditions, notCondition } from \"../../engine/hooks\";\n\
         import { changeGameDataNumber, compareGameData } from \"../../engine/mechanics/gameData\";\n\
         import { COMPLETION_EFFECTS } from \"../../game/effects\";\n\
         import { FLAG_RUNTIME } from \"../../game/flagRuntime\";\n\
         import type { GeneratedGameState, RuntimeAction } from \"../../game/types\";\n\n\
         const action: RuntimeAction = {\n",
    );
    writeln!(output, "  uuid: {uuid},").unwrap();
    writeln!(output, "  title: {title},").unwrap();
    writeln!(output, "  flavour: {flavour},").unwrap();
    writeln!(output, "  flavourText: {flavour},").unwrap();
    writeln!(output, "  weight: {},", action.weight).unwrap();
    writeln!(output, "  repeatable: {},", action.repeatable).unwrap();
    writeln!(output, "  stopOnRepeat: {},", action.stop_on_repeat).unwrap();
    writeln!(output, "  requiredSkill: {skill},").unwrap();
    writeln!(output, "  skill: {skill},").unwrap();
    writeln!(output, "  movementDestination: {movement_destination},").unwrap();
    writeln!(output, "  conditions: {conditions},").unwrap();
    writeln!(output, "  revealConditions: {reveal_conditions},").unwrap();
    writeln!(output, "  revealExplanations: {reveal_explanations},").unwrap();
    output.push_str("  crossGeneration: false,\n");
    writeln!(output, "  onComplete: {effects},").unwrap();
    output.push_str("};\n\nexport default action;\n");
    Ok(output)
}

fn generate_reveals(reveals: &[ActionRevealCondition]) -> Result<(String, String), ProjectError> {
    let conditions = reveals
        .iter()
        .map(|reveal| generate_condition(&reveal.condition))
        .collect::<Result<Vec<_>, _>>()?;
    let explanations = reveals
        .iter()
        .map(|reveal| json(&reveal.description))
        .collect::<Result<Vec<_>, _>>()?;
    Ok((
        format!("[{}]", conditions.join(", ")),
        format!("[{}]", explanations.join(", ")),
    ))
}

fn generate_effects(
    effects: &[ActionEffect],
    items: &[ItemDefinition],
    flags: &[FlagDefinition],
) -> Result<String, ProjectError> {
    let expressions = effects
        .iter()
        .map(|effect| match effect.effect.as_str() {
            "addLog" => Ok(format!(
                "COMPLETION_EFFECTS.addLog({})",
                json(&effect.value)?
            )),
            "cutDecay" | "restoreEnergy" | "spendEnergy" | "setEnergy" => {
                let value = effect.value.parse::<f64>().map_err(|_| {
                    ProjectError::InvalidInput("Effect value must be a number.".into())
                })?;
                Ok(format!("COMPLETION_EFFECTS.{}({value})", effect.effect))
            }
            "addItem" => {
                let item = items
                    .iter()
                    .find(|item| item.uuid.to_string() == effect.value)
                    .ok_or_else(|| {
                        ProjectError::InvalidInput("Effect item was not found.".into())
                    })?;
                let capacity = item
                    .capacity
                    .map_or("null".into(), |value| value.to_string());
                Ok(format!(
                    "COMPLETION_EFFECTS.addItem({}, {}, {capacity})",
                    json(&effect.value)?,
                    effect.amount.unwrap_or(1),
                ))
            }
            "useItem" => Ok(format!(
                "COMPLETION_EFFECTS.useItem({}, {})",
                json(&effect.value)?,
                effect.amount.unwrap_or(1),
            )),
            "changeLocation" => Ok(format!(
                "COMPLETION_EFFECTS.changeLocation({})",
                json(&effect.value)?,
            )),
            "custom" => generate_custom_effect(effect),
            unsupported => generate_flag_effect(effect, flags)?.ok_or_else(|| {
                ProjectError::InvalidInput(format!(
                    "Action completion effect `{unsupported}` cannot be compiled."
                ))
            }),
        })
        .collect::<Result<Vec<_>, _>>()?;
    Ok(format!("[{}]", expressions.join(", ")))
}

fn generate_conditions(join: &str, conditions: &[ActionCondition]) -> Result<String, ProjectError> {
    if conditions.is_empty() {
        return Ok("[]".into());
    }
    let helper = if join == "or" {
        "anyConditions"
    } else {
        "allConditions"
    };
    let expressions = conditions
        .iter()
        .map(generate_condition)
        .collect::<Result<Vec<_>, _>>()?;
    Ok(format!("[{helper}([{}])]", expressions.join(", ")))
}

fn generate_condition(condition: &ActionCondition) -> Result<String, ProjectError> {
    let value = json(&condition.value)?;
    let predicate = match condition.condition.as_str() {
        "location" => format!("(state: GeneratedGameState) => state.currentLocation === {value}"),
        "actionDoneThisRun" => format!(
            "(state: GeneratedGameState) => state.runtime.completedActions.includes({value})"
        ),
        "actionDoneHistorically" => {
            format!("(state: GeneratedGameState) => state.historicalActions.includes({value})")
        }
        "hasItem" => format!(
            "(state: GeneratedGameState) => (state.runtime.inventory[{value}]?.amount ?? 0) >= {}",
            condition.amount.unwrap_or(1),
        ),
        "custom" => generate_custom_condition(condition)?,
        unsupported => generate_flag_condition(condition)?.ok_or_else(|| {
            ProjectError::InvalidInput(format!(
                "Action condition `{unsupported}` cannot be compiled."
            ))
        })?,
    };
    Ok(if condition.not {
        format!("notCondition({predicate})")
    } else {
        predicate
    })
}

#[cfg(test)]
#[path = "action_codegen_tests.rs"]
mod tests;
