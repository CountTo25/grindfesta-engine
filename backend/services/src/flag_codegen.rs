use crate::game_codegen::json;
use crate::{ActionCondition, ActionEffect, FlagDefinition, FlagValueType, ProjectError};

pub(crate) fn generate_flag_condition(
    condition: &ActionCondition,
) -> Result<Option<String>, ProjectError> {
    let uuid = json(&condition.value)?;
    let expression = match condition.condition.as_str() {
        "hasFlag" => format!("FLAG_RUNTIME.flag({uuid})"),
        "flagEquals" => format!(
            "FLAG_RUNTIME.flag({uuid}, (value) => value === {})",
            json(condition.comparison_value.as_deref().unwrap_or(""))?,
        ),
        "flagAtLeast" => format!(
            "FLAG_RUNTIME.numericFlagAtLeast({uuid}, {})",
            condition.amount.unwrap_or(0),
        ),
        "flagAtMost" => format!(
            "FLAG_RUNTIME.numericFlagAtMost({uuid}, {})",
            condition.amount.unwrap_or(0),
        ),
        _ => return Ok(None),
    };
    Ok(Some(expression))
}

pub(crate) fn generate_flag_effect(
    effect: &ActionEffect,
    flags: &[FlagDefinition],
) -> Result<Option<String>, ProjectError> {
    let flag = flags
        .iter()
        .find(|flag| flag.uuid.to_string() == effect.value);
    let uuid = json(&effect.value)?;
    let expression = match effect.effect.as_str() {
        "setFlag" => match flag.map(|flag| flag.value_type) {
            Some(FlagValueType::Boolean) => format!("FLAG_RUNTIME.setFlag({uuid})"),
            Some(FlagValueType::Number) => format!(
                "FLAG_RUNTIME.setFlag({uuid}, {})",
                json(&effect.amount.unwrap_or(0).to_string())?,
            ),
            Some(FlagValueType::Text) => format!(
                "FLAG_RUNTIME.setFlag({uuid}, {})",
                json(effect.flag_value.as_deref().unwrap_or(""))?,
            ),
            None => return Err(not_found()),
        },
        "increaseFlag" => format!(
            "FLAG_RUNTIME.increaseNumericFlag({uuid}, {})",
            effect.amount.unwrap_or(1),
        ),
        "decreaseFlag" => format!(
            "FLAG_RUNTIME.decreaseNumericFlag({uuid}, {})",
            effect.amount.unwrap_or(1),
        ),
        "clearFlag" => format!("FLAG_RUNTIME.removeFlag({uuid})"),
        _ => return Ok(None),
    };
    Ok(Some(expression))
}

fn not_found() -> ProjectError {
    ProjectError::InvalidInput("Effect flag was not found.".into())
}
