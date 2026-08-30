use uuid::Uuid;

use crate::{FlagDefinition, FlagValueType, ProjectError};

pub(crate) fn validate_flag_effect(
    effect: &str,
    value: &str,
    requested_amount: Option<u32>,
    requested_flag_value: Option<&str>,
    flags: &[FlagDefinition],
) -> Result<(Option<u32>, Option<String>), ProjectError> {
    let uuid = Uuid::parse_str(value).map_err(|_| not_found())?;
    let flag = flags
        .iter()
        .find(|flag| flag.uuid == uuid)
        .ok_or_else(not_found)?;
    match effect {
        "setFlag" => match flag.value_type {
            FlagValueType::Boolean => Ok((None, None)),
            FlagValueType::Number => {
                validate_number(requested_amount).map(|value| (Some(value), None))
            }
            FlagValueType::Text => {
                validate_text(requested_flag_value).map(|value| (None, Some(value)))
            }
        },
        "increaseFlag" | "decreaseFlag" if flag.value_type == FlagValueType::Number => {
            validate_amount(requested_amount)?;
            Ok((Some(requested_amount.unwrap_or(1)), None))
        }
        "clearFlag" => Ok((None, None)),
        _ => Err(ProjectError::InvalidInput(
            "Numeric flag effects require a number flag.".into(),
        )),
    }
}

fn validate_number(amount: Option<u32>) -> Result<u32, ProjectError> {
    if amount.is_some_and(|value| value > 1_000_000) {
        return Err(ProjectError::InvalidInput(
            "Flag value must be between 0 and 1000000.".into(),
        ));
    }
    Ok(amount.unwrap_or(0))
}

fn validate_text(value: Option<&str>) -> Result<String, ProjectError> {
    let value = value.unwrap_or("").trim();
    if value.is_empty() || value.chars().count() > 200 {
        return Err(ProjectError::InvalidInput(
            "Flag value must be between 1 and 200 characters.".into(),
        ));
    }
    Ok(value.into())
}

fn validate_amount(amount: Option<u32>) -> Result<(), ProjectError> {
    if amount.unwrap_or(1) == 0 || amount.is_some_and(|value| value > 1_000_000) {
        return Err(ProjectError::InvalidInput(
            "Amount must be between 1 and 1000000.".into(),
        ));
    }
    Ok(())
}

fn not_found() -> ProjectError {
    ProjectError::InvalidInput("Effect flag was not found.".into())
}
