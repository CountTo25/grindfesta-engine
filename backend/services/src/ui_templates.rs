use std::collections::BTreeMap;
use std::sync::OnceLock;

use serde::Deserialize;

use crate::{ProjectError, ProjectUi};

pub type UiThemeVariables = BTreeMap<String, String>;

#[derive(Deserialize)]
struct ThemeSchema {
    variables: BTreeMap<String, ThemeVariable>,
}

#[derive(Deserialize)]
struct ThemeVariable {
    #[allow(dead_code)]
    name: String,
    value: String,
    #[allow(dead_code)]
    flavour: String,
}

pub(crate) fn default_variables(component_set: &str) -> UiThemeVariables {
    schema(component_set)
        .map(|schema| {
            schema
                .variables
                .iter()
                .map(|(key, definition)| (key.clone(), definition.value.clone()))
                .collect()
        })
        .unwrap_or_default()
}

pub(crate) fn merge_variable_defaults(
    component_set: &str,
    variables: &UiThemeVariables,
) -> UiThemeVariables {
    let mut merged = default_variables(component_set);
    if let Some(schema) = schema(component_set) {
        merged.extend(variables.iter().map(|(key, value)| {
            let value = schema
                .variables
                .get(key)
                .map(|definition| migrate_legacy_value(definition, value))
                .unwrap_or_else(|| value.clone());
            (key.clone(), value)
        }));
    } else {
        merged.extend(variables.clone());
    }
    merged
}

pub(crate) fn validate_variables(
    component_set: &str,
    variables: UiThemeVariables,
) -> Result<UiThemeVariables, ProjectError> {
    let definitions = schema(component_set).ok_or_else(|| {
        ProjectError::InvalidInput("Selected UI components are not available.".into())
    })?;
    let mut validated = default_variables(component_set);
    for (key, requested_value) in variables {
        let definition = definitions.variables.get(&key).ok_or_else(|| {
            ProjectError::InvalidInput(
                "UI theme variable is not available for the selected theme.".into(),
            )
        })?;
        let value = requested_value.trim().to_owned();
        if value.is_empty() || value.chars().count() > 240 || value.chars().any(char::is_control) {
            return invalid("UI theme variable value is not valid.");
        }
        if definition.value.starts_with('#') && !is_hex_color(&value) {
            return invalid(&format!("{} must use #RRGGBB.", definition.name));
        }
        validated.insert(key, value.to_ascii_lowercase());
    }
    Ok(validated)
}

fn migrate_legacy_value(definition: &ThemeVariable, value: &str) -> String {
    if !definition.value.starts_with('#') || is_hex_color(value) {
        return value.to_owned();
    }
    let channels = value
        .split_whitespace()
        .map(str::parse::<u8>)
        .collect::<Result<Vec<_>, _>>();
    match channels {
        Ok(channels) if channels.len() == 3 => {
            format!("#{:02x}{:02x}{:02x}", channels[0], channels[1], channels[2])
        }
        _ => value.to_owned(),
    }
}

fn is_hex_color(value: &str) -> bool {
    value.len() == 7
        && value.starts_with('#')
        && value[1..]
            .chars()
            .all(|character| character.is_ascii_hexdigit())
}

pub(crate) fn compiler_replacements(ui: &ProjectUi) -> Vec<(String, String)> {
    let variables = merge_variable_defaults(&ui.component_set, &ui.variables);
    let mut replacements = variables
        .into_iter()
        .map(|(key, value)| (placeholder(&key), value))
        .collect::<Vec<_>>();
    replacements.sort_by(|left, right| right.0.len().cmp(&left.0.len()));
    replacements
}

fn schema(component_set: &str) -> Option<&'static ThemeSchema> {
    static GLASS: OnceLock<ThemeSchema> = OnceLock::new();
    match component_set {
        "glass" => Some(GLASS.get_or_init(|| {
            serde_json::from_str(include_str!("../../../template/glass/schema.json"))
                .expect("Glass theme schema must be valid")
        })),
        _ => None,
    }
}

fn placeholder(key: &str) -> String {
    let mut result = String::new();
    let mut previous_is_lower_or_digit = false;
    for character in key.chars() {
        if character.is_ascii_alphanumeric() {
            if character.is_ascii_uppercase() && previous_is_lower_or_digit {
                result.push('_');
            }
            result.push(character.to_ascii_uppercase());
            previous_is_lower_or_digit =
                character.is_ascii_lowercase() || character.is_ascii_digit();
        } else if !result.ends_with('_') && !result.is_empty() {
            result.push('_');
            previous_is_lower_or_digit = false;
        }
    }
    result.trim_matches('_').to_owned()
}

fn invalid<Value>(message: &str) -> Result<Value, ProjectError> {
    Err(ProjectError::InvalidInput(message.into()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn loads_glass_defaults_and_builds_uppercase_placeholders() {
        assert_eq!(default_variables("glass")["glassAccent"], "#047857");
        assert_eq!(placeholder("glassAccent"), "GLASS_ACCENT");
    }

    #[test]
    fn compiler_uses_project_variable_overrides() {
        let mut ui = ProjectUi::validated("glass").unwrap();
        ui.variables.insert("glassAccent".into(), "#0c2238".into());
        assert_eq!(
            compiler_replacements(&ui),
            vec![("GLASS_ACCENT".into(), "#0c2238".into())]
        );
    }

    #[test]
    fn migrates_legacy_rgb_channels_to_hex() {
        let variables = BTreeMap::from([("glassAccent".into(), "4 120 87".into())]);
        assert_eq!(
            merge_variable_defaults("glass", &variables)["glassAccent"],
            "#047857"
        );
    }

    #[test]
    fn rejects_non_hex_color_updates() {
        let variables = BTreeMap::from([("glassAccent".into(), "4 120 87".into())]);
        assert!(validate_variables("glass", variables).is_err());
    }

    #[test]
    fn rejects_variables_the_theme_does_not_define() {
        let variables = BTreeMap::from([("unknown".into(), "value".into())]);
        assert!(validate_variables("glass", variables).is_err());
    }
}
