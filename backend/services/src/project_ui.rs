use serde::{Deserialize, Serialize};

use crate::ProjectError;
use crate::ui_templates::{UiThemeVariables, default_variables, merge_variable_defaults};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectUi {
    #[serde(alias = "component_set")]
    pub component_set: String,
    #[serde(default)]
    pub controls: UiControls,
    #[serde(default)]
    pub variables: UiThemeVariables,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UiControls {
    #[serde(default)]
    pub play: UiControl,
    #[serde(default)]
    pub pause: UiControl,
    #[serde(default)]
    pub queue: UiControl,
    #[serde(default)]
    pub energy: UiControl,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UiControl {
    #[serde(default)]
    pub mode: UiControlMode,
    #[serde(default)]
    pub icon: String,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum UiControlMode {
    #[default]
    Text,
    Icon,
}

impl ProjectUi {
    pub(crate) fn validated(component_set: &str) -> Result<Self, ProjectError> {
        let component_set = match component_set.trim() {
            "glass" => "glass".to_owned(),
            _ => return invalid("Selected UI components are not available."),
        };
        Ok(Self {
            variables: default_variables(&component_set),
            component_set,
            controls: UiControls::default(),
        })
    }

    pub(crate) fn with_variable_defaults(mut self) -> Self {
        self.variables = merge_variable_defaults(&self.component_set, &self.variables);
        self
    }
}

impl UiControls {
    pub(crate) fn validated(mut self) -> Result<Self, ProjectError> {
        self.play.validate("Play")?;
        self.pause.validate("Pause")?;
        self.queue.validate("Queue")?;
        self.energy.validate("Energy")?;
        Ok(self)
    }
}

impl UiControl {
    fn validate(&mut self, label: &str) -> Result<(), ProjectError> {
        self.icon = self.icon.trim().to_owned();
        if self.icon.chars().count() > 240 || self.icon.chars().any(char::is_control) {
            return invalid(&format!("{label} icon classes are not valid."));
        }
        if matches!(self.mode, UiControlMode::Icon) && self.icon.is_empty() {
            return invalid(&format!("Choose an icon before using {label} as an icon."));
        }
        Ok(())
    }
}

fn invalid<Value>(message: &str) -> Result<Value, ProjectError> {
    Err(ProjectError::InvalidInput(message.into()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn legacy_ui_defaults_controls_to_text() {
        let ui: ProjectUi = serde_json::from_str(r#"{"componentSet":"glass"}"#).unwrap();
        assert!(matches!(ui.controls.play.mode, UiControlMode::Text));
        assert!(matches!(ui.controls.pause.mode, UiControlMode::Text));
        assert!(matches!(ui.controls.queue.mode, UiControlMode::Text));
        assert!(matches!(ui.controls.energy.mode, UiControlMode::Text));
    }

    #[test]
    fn icon_mode_requires_icon_classes() {
        let controls = UiControls {
            play: UiControl {
                mode: UiControlMode::Icon,
                icon: "".into(),
            },
            ..UiControls::default()
        };
        assert!(controls.validated().is_err());
    }
}
