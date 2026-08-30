use serde_json::Value;

use crate::{ActionComparison, ProjectError};

pub(crate) const CUSTOM: &str = "custom";
const ROOT_FIELDS: &[&str] = &[
    "runtime",
    "currentLocation",
    "energy",
    "runExperience",
    "flags",
    "timeline",
];
const BLOCKED_FIELDS: &[&str] = &["__proto__", "prototype", "constructor"];

pub(crate) fn validate_game_data_path(value: &str) -> Result<String, ProjectError> {
    let path = value.trim();
    if path.len() > 512 {
        return Err(invalid_path());
    }
    let segments = parse_path(path).ok_or_else(invalid_path)?;
    if segments.is_empty()
        || !ROOT_FIELDS.contains(&segments[0].as_str())
        || segments
            .iter()
            .any(|segment| BLOCKED_FIELDS.contains(&segment.as_str()))
    {
        return Err(invalid_path());
    }
    Ok(path.into())
}

pub(crate) fn validate_custom_check(
    check: Option<ActionComparison>,
) -> Result<ActionComparison, ProjectError> {
    let check = check
        .ok_or_else(|| ProjectError::InvalidInput("Custom condition check is required.".into()))?;
    if !matches!(check.operator.as_str(), "=" | "<=" | ">=") {
        return Err(ProjectError::InvalidInput(
            "Custom condition check must be `=`, `<=`, or `>=`.".into(),
        ));
    }
    match &check.value {
        Value::Null | Value::Bool(_) if check.operator != "=" => Err(ProjectError::InvalidInput(
            "Null and boolean values only support `=`.".into(),
        )),
        Value::String(value) if value.chars().count() > 500 => Err(ProjectError::InvalidInput(
            "Custom comparison text is too long.".into(),
        )),
        Value::Null | Value::Bool(_) | Value::Number(_) | Value::String(_) => Ok(check),
        _ => Err(ProjectError::InvalidInput(
            "Custom comparison must be a JSON scalar value.".into(),
        )),
    }
}

fn parse_path(path: &str) -> Option<Vec<String>> {
    let bytes = path.as_bytes();
    if bytes.first() != Some(&b'$') {
        return None;
    }
    let mut index = 1;
    let mut segments = Vec::new();
    while index < bytes.len() {
        match bytes[index] {
            b'.' => {
                index += 1;
                let start = index;
                if !bytes
                    .get(index)
                    .is_some_and(|byte| is_identifier_start(*byte))
                {
                    return None;
                }
                index += 1;
                while bytes
                    .get(index)
                    .is_some_and(|byte| is_identifier_part(*byte))
                {
                    index += 1;
                }
                segments.push(path[start..index].into());
            }
            b'[' => {
                index += 1;
                let (segment, next) = parse_bracket(path, index)?;
                segments.push(segment);
                index = next;
            }
            _ => return None,
        }
    }
    Some(segments)
}

fn parse_bracket(path: &str, start: usize) -> Option<(String, usize)> {
    let bytes = path.as_bytes();
    if bytes.get(start) == Some(&b'"') {
        let mut index = start + 1;
        let mut escaped = false;
        while index < bytes.len() {
            if bytes[index] == b'"' && !escaped {
                let value = serde_json::from_str::<String>(&path[start..=index]).ok()?;
                return (bytes.get(index + 1) == Some(&b']')).then_some((value, index + 2));
            }
            escaped = bytes[index] == b'\\' && !escaped;
            if bytes[index] != b'\\' {
                escaped = false;
            }
            index += 1;
        }
        return None;
    }
    let mut index = start;
    while bytes.get(index).is_some_and(u8::is_ascii_digit) {
        index += 1;
    }
    if index == start || bytes.get(index) != Some(&b']') {
        return None;
    }
    Some((path[start..index].into(), index + 1))
}

fn is_identifier_start(byte: u8) -> bool {
    byte.is_ascii_alphabetic() || matches!(byte, b'_' | b'$')
}

fn is_identifier_part(byte: u8) -> bool {
    is_identifier_start(byte) || byte.is_ascii_digit()
}

fn invalid_path() -> ProjectError {
    ProjectError::InvalidInput("Custom condition field path is invalid.".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn validates_active_run_paths() {
        assert_eq!(
            validate_game_data_path("$.energy.currentEnergy").unwrap(),
            "$.energy.currentEnergy"
        );
        assert!(validate_game_data_path("$.flags[\"ore-id\"]").is_ok());
        assert!(validate_game_data_path("$.project.name").is_err());
        assert!(validate_game_data_path("$.__proto__.polluted").is_err());
    }

    #[test]
    fn validates_typed_comparisons() {
        let numeric = ActionComparison {
            operator: ">=".into(),
            value: json!(5),
        };
        assert_eq!(
            validate_custom_check(Some(numeric.clone())).unwrap(),
            numeric
        );
        let boolean = ActionComparison {
            operator: "<=".into(),
            value: json!(true),
        };
        assert!(validate_custom_check(Some(boolean)).is_err());
    }
}
