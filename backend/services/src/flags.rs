use std::{collections::BTreeMap, io::ErrorKind, path::Path};

use serde::{Deserialize, Serialize};
use tokio::fs;
use uuid::Uuid;

use crate::{ProjectError, ProjectService};

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum FlagValueType {
    Boolean,
    Number,
    Text,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FlagDefinition {
    pub uuid: Uuid,
    pub name: String,
    pub value_type: FlagValueType,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StoredFlag {
    pub(crate) name: String,
    pub(crate) value_type: FlagValueType,
}

impl ProjectService {
    pub async fn list_flags(
        &self,
        project_uuid: &str,
    ) -> Result<Vec<FlagDefinition>, ProjectError> {
        let _guard = self.flags_lock.lock().await;
        let path = self.project_dir(project_uuid).await?.join("flags.json");
        Ok(read_flags(&path)
            .await?
            .into_iter()
            .map(definition)
            .collect())
    }

    pub async fn create_flag(
        &self,
        project_uuid: &str,
        requested_name: &str,
        value_type: FlagValueType,
    ) -> Result<FlagDefinition, ProjectError> {
        let name = validate_name(requested_name)?;
        let _guard = self.flags_lock.lock().await;
        let path = self.project_dir(project_uuid).await?.join("flags.json");
        let mut flags = read_flags(&path).await?;
        if flags
            .values()
            .any(|flag| flag.name.eq_ignore_ascii_case(&name))
        {
            return Err(ProjectError::InvalidInput(
                "A flag with this name already exists.".into(),
            ));
        }
        let uuid = Uuid::new_v4();
        let stored = StoredFlag { name, value_type };
        let flag = definition((uuid, stored.clone()));
        flags.insert(uuid, stored);
        write_flags(&path, &flags).await?;
        Ok(flag)
    }
}

pub(crate) async fn read_flags(path: &Path) -> Result<BTreeMap<Uuid, StoredFlag>, ProjectError> {
    let json = match fs::read_to_string(path).await {
        Ok(json) => json,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(BTreeMap::new()),
        Err(error) => return Err(ProjectError::Internal(error.to_string())),
    };
    serde_json::from_str(&json).map_err(|error| ProjectError::Internal(error.to_string()))
}

pub(crate) async fn write_flags(
    path: &Path,
    flags: &BTreeMap<Uuid, StoredFlag>,
) -> Result<(), ProjectError> {
    let json = serde_json::to_string_pretty(flags)
        .map_err(|error| ProjectError::Internal(error.to_string()))?;
    fs::write(path, json + "\n")
        .await
        .map_err(|error| ProjectError::Internal(error.to_string()))
}

pub(crate) fn definition((uuid, flag): (Uuid, StoredFlag)) -> FlagDefinition {
    FlagDefinition {
        uuid,
        name: flag.name,
        value_type: flag.value_type,
    }
}

pub(crate) fn validate_name(requested: &str) -> Result<String, ProjectError> {
    let name = requested.trim();
    if name.is_empty() || name.chars().count() > 80 {
        return Err(ProjectError::InvalidInput(
            "Flag name must be between 1 and 80 characters.".into(),
        ));
    }
    Ok(name.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_flag_names_and_types() {
        assert_eq!(validate_name("  Door open  ").unwrap(), "Door open");
        assert!(validate_name(" ").is_err());
        assert_eq!(
            serde_json::to_string(&FlagValueType::Number).unwrap(),
            "\"number\""
        );
    }
}
