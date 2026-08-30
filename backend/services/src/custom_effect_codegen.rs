use crate::game_codegen::json;
use crate::{ActionEffect, ProjectError};

pub(crate) fn generate_custom_effect(effect: &ActionEffect) -> Result<String, ProjectError> {
    let operation = effect
        .operation
        .as_deref()
        .ok_or_else(|| ProjectError::InvalidInput("Custom number operation is missing.".into()))?;
    let operand = effect
        .operand
        .ok_or_else(|| ProjectError::InvalidInput("Custom number amount is missing.".into()))?;
    Ok(format!(
        "(state: GeneratedGameState) => changeGameDataNumber(state, {}, {}, {operand})",
        json(&effect.value)?,
        json(operation)?,
    ))
}
