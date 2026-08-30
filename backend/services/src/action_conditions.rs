use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

use crate::custom_conditions::{CUSTOM, validate_custom_check, validate_game_data_path};
use crate::{FlagValueType, ProjectError, ProjectService};

const LOCATION: &str = "location";
const ACTION_DONE_THIS_RUN: &str = "actionDoneThisRun";
const ACTION_DONE_HISTORICALLY: &str = "actionDoneHistorically";
const HAS_ITEM: &str = "hasItem";
const HAS_FLAG: &str = "hasFlag";
const FLAG_EQUALS: &str = "flagEquals";
const FLAG_AT_LEAST: &str = "flagAtLeast";
const FLAG_AT_MOST: &str = "flagAtMost";

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct ActionComparison {
    pub operator: String,
    pub value: Value,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct ActionCondition {
    pub condition: String,
    pub value: String,
    #[serde(default)]
    pub not: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub amount: Option<u32>,
    #[serde(
        default,
        rename = "comparisonValue",
        skip_serializing_if = "Option::is_none"
    )]
    pub comparison_value: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub check: Option<ActionComparison>,
}

pub(crate) fn validate_condition_join(requested: &str) -> Result<String, ProjectError> {
    match requested.trim() {
        "and" => Ok("and".into()),
        "or" => Ok("or".into()),
        _ => Err(ProjectError::InvalidInput(
            "Condition join must be `and` or `or`.".into(),
        )),
    }
}

impl ProjectService {
    pub(crate) async fn validate_action_conditions(
        &self,
        project_uuid: &str,
        requested: Vec<ActionCondition>,
    ) -> Result<Vec<ActionCondition>, ProjectError> {
        if requested.len() > 32 {
            return Err(ProjectError::InvalidInput(
                "An action can have at most 32 conditions.".into(),
            ));
        }

        let locations = self.list_locations(project_uuid).await?;
        let actions = self.list_actions(project_uuid).await?;
        let items = self.list_items(project_uuid).await?;
        let flags = self.list_flags(project_uuid).await?;
        let location_uuids: HashSet<Uuid> = locations
            .into_iter()
            .map(|location| location.uuid)
            .collect();
        let action_uuids: HashSet<Uuid> = actions.into_iter().map(|action| action.uuid).collect();
        let item_uuids: HashSet<Uuid> = items.into_iter().map(|item| item.uuid).collect();
        let flag_types: HashMap<Uuid, FlagValueType> = flags
            .into_iter()
            .map(|flag| (flag.uuid, flag.value_type))
            .collect();
        let mut unique_conditions = HashSet::new();
        let mut conditions = Vec::with_capacity(requested.len());

        for requested_condition in requested {
            let condition = requested_condition.condition.trim();
            if condition == CUSTOM {
                let normalized = ActionCondition {
                    condition: CUSTOM.into(),
                    value: validate_game_data_path(&requested_condition.value)?,
                    not: requested_condition.not,
                    amount: None,
                    comparison_value: None,
                    check: Some(validate_custom_check(requested_condition.check)?),
                };
                insert_unique(&mut unique_conditions, &normalized)?;
                conditions.push(normalized);
                continue;
            }
            let value = Uuid::parse_str(requested_condition.value.trim())
                .map_err(|_| ProjectError::InvalidInput("Condition value was not found.".into()))?;
            let found = match condition {
                LOCATION => location_uuids.contains(&value),
                ACTION_DONE_THIS_RUN | ACTION_DONE_HISTORICALLY => action_uuids.contains(&value),
                HAS_ITEM => item_uuids.contains(&value),
                HAS_FLAG => flag_types.contains_key(&value),
                FLAG_EQUALS => flag_types.get(&value) == Some(&FlagValueType::Text),
                FLAG_AT_LEAST | FLAG_AT_MOST => {
                    flag_types.get(&value) == Some(&FlagValueType::Number)
                }
                _ => {
                    return Err(ProjectError::InvalidInput(
                        "Action condition is not supported.".into(),
                    ));
                }
            };
            if !found {
                return Err(ProjectError::InvalidInput(
                    "Condition value was not found.".into(),
                ));
            }
            let normalized = ActionCondition {
                condition: condition.to_owned(),
                value: value.to_string(),
                not: requested_condition.not,
                amount: if condition == HAS_ITEM {
                    Some(validate_amount(requested_condition.amount)?)
                } else if matches!(condition, FLAG_AT_LEAST | FLAG_AT_MOST) {
                    Some(validate_flag_target(requested_condition.amount)?)
                } else {
                    None
                },
                comparison_value: if condition == FLAG_EQUALS {
                    Some(validate_comparison(
                        requested_condition.comparison_value.as_deref(),
                    )?)
                } else {
                    None
                },
                check: None,
            };
            insert_unique(&mut unique_conditions, &normalized)?;
            conditions.push(normalized);
        }

        Ok(conditions)
    }
}

fn insert_unique(
    unique: &mut HashSet<String>,
    condition: &ActionCondition,
) -> Result<(), ProjectError> {
    let key = serde_json::to_string(condition)
        .map_err(|error| ProjectError::Internal(error.to_string()))?;
    if unique.insert(key) {
        Ok(())
    } else {
        Err(ProjectError::InvalidInput(
            "Duplicate action conditions are not allowed.".into(),
        ))
    }
}

fn validate_flag_target(amount: Option<u32>) -> Result<u32, ProjectError> {
    if amount.is_some_and(|value| value > 1_000_000) {
        return Err(ProjectError::InvalidInput(
            "Flag target must be between 0 and 1000000.".into(),
        ));
    }
    Ok(amount.unwrap_or(0))
}

fn validate_comparison(value: Option<&str>) -> Result<String, ProjectError> {
    let value = value.unwrap_or("").trim();
    if value.is_empty() || value.chars().count() > 200 {
        return Err(ProjectError::InvalidInput(
            "Flag comparison must be between 1 and 200 characters.".into(),
        ));
    }
    Ok(value.into())
}

fn validate_amount(amount: Option<u32>) -> Result<u32, ProjectError> {
    let amount = amount.unwrap_or(1);
    if amount == 0 || amount > 1_000_000 {
        return Err(ProjectError::InvalidInput(
            "Item amount must be between 1 and 1000000.".into(),
        ));
    }
    Ok(amount)
}

#[cfg(test)]
#[path = "action_conditions_tests.rs"]
mod tests;
