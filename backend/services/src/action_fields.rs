use crate::ProjectError;

pub(crate) fn validate_text(
    requested: &str,
    label: &str,
    maximum: usize,
) -> Result<String, ProjectError> {
    let value = requested.trim();
    if value.is_empty() {
        return Err(ProjectError::InvalidInput(format!("{label} is required.")));
    }
    if value.chars().count() > maximum {
        return Err(ProjectError::InvalidInput(format!(
            "{label} must be {maximum} characters or fewer."
        )));
    }
    Ok(value.to_owned())
}

pub(crate) fn validate_weight(weight: f64) -> Result<f64, ProjectError> {
    if !weight.is_finite() || weight <= 0.0 || weight > 1_000_000.0 {
        return Err(ProjectError::InvalidInput(
            "Action weight must be greater than zero.".into(),
        ));
    }
    Ok(weight)
}

pub(crate) fn validate_repetition(
    repeatable: bool,
    stop_on_repeat: bool,
) -> Result<(), ProjectError> {
    if stop_on_repeat && !repeatable {
        return Err(ProjectError::InvalidInput(
            "A completion-stopping action must be repeatable.".into(),
        ));
    }
    Ok(())
}
