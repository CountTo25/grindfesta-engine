use crate::ProjectError;
use crate::custom_conditions::validate_game_data_path;

pub(crate) const CUSTOM: &str = "custom";

pub(crate) fn validate_custom_effect(
    path: &str,
    operation: Option<&str>,
    operand: Option<f64>,
) -> Result<(String, String, f64), ProjectError> {
    let operation = operation.unwrap_or("").trim();
    if !matches!(operation, "add" | "subtract") {
        return Err(ProjectError::InvalidInput(
            "Custom number operation must be `add` or `subtract`.".into(),
        ));
    }
    let operand = operand.unwrap_or(0.0);
    if !operand.is_finite() || operand <= 0.0 || operand > 1_000_000_000.0 {
        return Err(ProjectError::InvalidInput(
            "Custom number amount must be above 0 and at most 1000000000.".into(),
        ));
    }
    Ok((validate_game_data_path(path)?, operation.into(), operand))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_numeric_mutations() {
        assert!(validate_custom_effect("$.energy.currentEnergy", Some("add"), Some(2.5)).is_ok());
        assert!(validate_custom_effect("$.energy.currentEnergy", Some("set"), Some(2.5)).is_err());
        assert!(
            validate_custom_effect("$.energy.currentEnergy", Some("subtract"), Some(0.0)).is_err()
        );
    }
}
