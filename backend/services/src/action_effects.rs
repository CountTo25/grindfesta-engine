use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::custom_effects::{CUSTOM, validate_custom_effect};
use crate::flag_effect_validation::validate_flag_effect;
use crate::{ProjectError, ProjectService};

const ADD_LOG: &str = "addLog";
const CUT_DECAY: &str = "cutDecay";
const RESTORE_ENERGY: &str = "restoreEnergy";
const SPEND_ENERGY: &str = "spendEnergy";
const SET_ENERGY: &str = "setEnergy";
const ADD_ITEM: &str = "addItem";
const USE_ITEM: &str = "useItem";
const CHANGE_LOCATION: &str = "changeLocation";
const SET_FLAG: &str = "setFlag";
const INCREASE_FLAG: &str = "increaseFlag";
const DECREASE_FLAG: &str = "decreaseFlag";
const CLEAR_FLAG: &str = "clearFlag";

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct ActionEffect {
    pub effect: String,
    pub value: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub amount: Option<u32>,
    #[serde(default, rename = "flagValue", skip_serializing_if = "Option::is_none")]
    pub flag_value: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub operation: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub operand: Option<f64>,
}

impl ProjectService {
    pub(crate) async fn validate_action_effects(
        &self,
        project_uuid: &str,
        requested: Vec<ActionEffect>,
    ) -> Result<Vec<ActionEffect>, ProjectError> {
        if requested.len() > 32 {
            return Err(ProjectError::InvalidInput(
                "An action can have at most 32 completion effects.".into(),
            ));
        }
        let items = self.list_items(project_uuid).await?;
        let flags = self.list_flags(project_uuid).await?;
        let locations = self.list_locations(project_uuid).await?;
        requested
            .into_iter()
            .map(|requested_effect| {
                let effect = requested_effect.effect.trim();
                let value = requested_effect.value.trim();
                let mut amount = None;
                let mut flag_value = None;
                let mut operation = None;
                let mut operand = None;
                let mut normalized_value = value.to_owned();
                match effect {
                    ADD_LOG => validate_log(value)?,
                    CUT_DECAY => validate_number(value, false)?,
                    RESTORE_ENERGY | SPEND_ENERGY | SET_ENERGY => validate_number(value, true)?,
                    ADD_ITEM | USE_ITEM => {
                        let item_uuid = Uuid::parse_str(value).map_err(|_| item_not_found())?;
                        if !items.iter().any(|item| item.uuid == item_uuid) {
                            return Err(item_not_found());
                        }
                        validate_amount(requested_effect.amount)?;
                        amount = Some(requested_effect.amount.unwrap_or(1));
                    }
                    CHANGE_LOCATION => {
                        let uuid = Uuid::parse_str(value).map_err(|_| location_not_found())?;
                        if !locations.iter().any(|location| location.uuid == uuid) {
                            return Err(location_not_found());
                        }
                    }
                    SET_FLAG | INCREASE_FLAG | DECREASE_FLAG | CLEAR_FLAG => {
                        (amount, flag_value) = validate_flag_effect(
                            effect,
                            value,
                            requested_effect.amount,
                            requested_effect.flag_value.as_deref(),
                            &flags,
                        )?;
                    }
                    CUSTOM => {
                        let normalized = validate_custom_effect(
                            value,
                            requested_effect.operation.as_deref(),
                            requested_effect.operand,
                        )?;
                        normalized_value = normalized.0;
                        operation = Some(normalized.1);
                        operand = Some(normalized.2);
                    }
                    _ => {
                        return Err(ProjectError::InvalidInput(
                            "Action completion effect is not supported.".into(),
                        ));
                    }
                }
                Ok(ActionEffect {
                    effect: effect.to_owned(),
                    value: normalized_value,
                    amount,
                    flag_value,
                    operation,
                    operand,
                })
            })
            .collect()
    }
}

fn item_not_found() -> ProjectError {
    ProjectError::InvalidInput("Effect item was not found.".into())
}

fn location_not_found() -> ProjectError {
    ProjectError::InvalidInput("Effect location was not found.".into())
}

fn validate_amount(amount: Option<u32>) -> Result<(), ProjectError> {
    if amount.unwrap_or(1) == 0 || amount.is_some_and(|value| value > 1_000_000) {
        return Err(ProjectError::InvalidInput(
            "Amount must be between 1 and 1000000.".into(),
        ));
    }
    Ok(())
}

fn validate_log(value: &str) -> Result<(), ProjectError> {
    if value.is_empty() || value.chars().count() > 500 {
        return Err(ProjectError::InvalidInput(
            "Timeline text must be between 1 and 500 characters.".into(),
        ));
    }
    Ok(())
}

fn validate_number(value: &str, allow_zero: bool) -> Result<(), ProjectError> {
    let number = value
        .parse::<f64>()
        .map_err(|_| ProjectError::InvalidInput("Effect value must be a number.".into()))?;
    if !number.is_finite() || number < 0.0 || (!allow_zero && number == 0.0) {
        return Err(ProjectError::InvalidInput(
            "Effect value must be a valid positive number.".into(),
        ));
    }
    Ok(())
}

#[cfg(test)]
#[path = "action_effects_tests.rs"]
mod tests;
