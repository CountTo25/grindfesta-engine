use crate::game_codegen::json;
use crate::{ActionCondition, ProjectError};

pub(crate) fn generate_custom_condition(
    condition: &ActionCondition,
) -> Result<String, ProjectError> {
    let check = condition
        .check
        .as_ref()
        .ok_or_else(|| ProjectError::InvalidInput("Custom condition check is missing.".into()))?;
    Ok(format!(
        "(state: GeneratedGameState) => compareGameData(state, {}, {}, {})",
        json(&condition.value)?,
        json(&check.operator)?,
        json(&check.value)?,
    ))
}
