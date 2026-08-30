use std::fmt;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{EngineVariables, ProjectUi};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub uuid: Uuid,
    pub schema_version: u32,
    pub name: String,
    pub description: String,
    pub engine_variables: EngineVariables,
    pub ui: ProjectUi,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectManifest {
    #[serde(alias = "schema_version")]
    schema_version: u32,
    name: String,
    description: String,
    #[serde(default)]
    engine_variables: EngineVariables,
    ui: ProjectUi,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectSchema {
    #[serde(alias = "schema_version")]
    schema_version: u32,
    uuid: Uuid,
}

#[derive(Debug)]
pub enum ProjectError {
    InvalidInput(String),
    AlreadyExists,
    NotFound,
    Internal(String),
}

impl Project {
    pub(crate) fn validated(
        requested_name: &str,
        requested_description: &str,
        requested_component_set: &str,
    ) -> Result<Self, ProjectError> {
        Ok(Self {
            uuid: Uuid::new_v4(),
            schema_version: 1,
            name: validate_name(requested_name)?,
            description: validate_description(requested_description)?,
            engine_variables: EngineVariables::default(),
            ui: ProjectUi::validated(requested_component_set)?,
        })
    }

    pub(crate) fn from_json(
        manifest_json: &str,
        schema_json: &str,
    ) -> Result<Self, serde_json::Error> {
        let manifest: ProjectManifest = serde_json::from_str(manifest_json)?;
        let schema: ProjectSchema = serde_json::from_str(schema_json)?;

        Ok(Self {
            uuid: schema.uuid,
            schema_version: manifest.schema_version,
            name: manifest.name,
            description: manifest.description,
            engine_variables: manifest.engine_variables,
            ui: manifest.ui.with_variable_defaults(),
        })
    }

    pub(crate) fn manifest_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(&ProjectManifest {
            schema_version: self.schema_version,
            name: self.name.clone(),
            description: self.description.clone(),
            engine_variables: self.engine_variables.clone(),
            ui: self.ui.clone(),
        })
    }

    pub(crate) fn schema_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(&ProjectSchema {
            schema_version: 1,
            uuid: self.uuid,
        })
    }

    pub(crate) fn uuid_from_schema(schema_json: &str) -> Result<Uuid, serde_json::Error> {
        Ok(serde_json::from_str::<ProjectSchema>(schema_json)?.uuid)
    }
}

impl fmt::Display for ProjectError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidInput(message) | Self::Internal(message) => formatter.write_str(message),
            Self::AlreadyExists => formatter.write_str("A project with this name already exists."),
            Self::NotFound => formatter.write_str("Project was not found."),
        }
    }
}

fn validate_name(requested_name: &str) -> Result<String, ProjectError> {
    let name = requested_name.trim();

    if name.is_empty() {
        return invalid("Project name is required.");
    }
    if name.chars().count() > 80 {
        return invalid("Project name must be 80 characters or fewer.");
    }
    if name == "." || name == ".." || name.ends_with('.') {
        return invalid("Project name is not valid.");
    }
    if name
        .chars()
        .any(|character| character.is_control() || r#"<>:"/\|?*"#.contains(character))
    {
        return invalid("Project name contains unsupported characters.");
    }
    if is_reserved_windows_name(name) {
        return invalid("Project name is reserved.");
    }

    Ok(name.to_owned())
}

fn validate_description(requested_description: &str) -> Result<String, ProjectError> {
    let description = requested_description.trim();

    if description.is_empty() {
        return invalid("Project description is required.");
    }
    if description.chars().count() > 500 {
        return invalid("Project description must be 500 characters or fewer.");
    }

    Ok(description.to_owned())
}

fn invalid<Value>(message: &str) -> Result<Value, ProjectError> {
    Err(ProjectError::InvalidInput(message.into()))
}

fn is_reserved_windows_name(name: &str) -> bool {
    let stem = name.split('.').next().unwrap_or(name).to_ascii_uppercase();
    matches!(stem.as_str(), "CON" | "PRN" | "AUX" | "NUL")
        || (stem.len() == 4
            && (stem.starts_with("COM") || stem.starts_with("LPT"))
            && matches!(stem.as_bytes()[3], b'1'..=b'9'))
}

#[cfg(test)]
#[path = "project_tests.rs"]
mod tests;
