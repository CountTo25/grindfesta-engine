use std::{collections::BTreeMap, io::ErrorKind, path::Path};

use serde::{Deserialize, Serialize};
use tokio::fs;
use uuid::Uuid;

use crate::{ItemAutoUse, ProjectError, ProjectService, item_auto_use::validate_auto_use};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemDefinition {
    pub uuid: Uuid,
    pub name: String,
    pub description: String,
    pub capacity: Option<u32>,
    pub auto_use: Option<ItemAutoUse>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StoredItem {
    pub(crate) name: String,
    pub(crate) description: String,
    pub(crate) capacity: Option<u32>,
    #[serde(default)]
    pub(crate) auto_use: Option<ItemAutoUse>,
}

impl ProjectService {
    pub async fn list_items(
        &self,
        project_uuid: &str,
    ) -> Result<Vec<ItemDefinition>, ProjectError> {
        let _guard = self.items_lock.lock().await;
        let path = self.project_dir(project_uuid).await?.join("items.json");
        Ok(read_items(&path)
            .await?
            .into_iter()
            .map(|(uuid, item)| item_definition(uuid, item))
            .collect())
    }

    pub async fn create_item(
        &self,
        project_uuid: &str,
        requested_name: &str,
        requested_description: &str,
        requested_capacity: Option<u32>,
        requested_auto_use: Option<ItemAutoUse>,
    ) -> Result<ItemDefinition, ProjectError> {
        let name = validate_text(requested_name, "Item name", 80)?;
        let description = validate_text(requested_description, "Item description", 500)?;
        let capacity = validate_capacity(requested_capacity)?;
        let auto_use = validate_auto_use(requested_auto_use)?;
        let _guard = self.items_lock.lock().await;
        let path = self.project_dir(project_uuid).await?.join("items.json");
        let mut items = read_items(&path).await?;
        if items
            .values()
            .any(|item| item.name.eq_ignore_ascii_case(&name))
        {
            return Err(ProjectError::InvalidInput(
                "An item with this name already exists.".into(),
            ));
        }
        let uuid = Uuid::new_v4();
        let stored = StoredItem {
            name,
            description,
            capacity,
            auto_use,
        };
        let item = item_definition(uuid, stored.clone());
        items.insert(uuid, stored);
        write_items(&path, &items).await?;
        Ok(item)
    }
}

pub(crate) async fn read_items(path: &Path) -> Result<BTreeMap<Uuid, StoredItem>, ProjectError> {
    let json = match fs::read_to_string(path).await {
        Ok(json) => json,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(BTreeMap::new()),
        Err(error) => return Err(ProjectError::Internal(error.to_string())),
    };
    serde_json::from_str(&json).map_err(|error| ProjectError::Internal(error.to_string()))
}

pub(crate) async fn write_items(
    path: &Path,
    items: &BTreeMap<Uuid, StoredItem>,
) -> Result<(), ProjectError> {
    let json = serde_json::to_string_pretty(items)
        .map_err(|error| ProjectError::Internal(error.to_string()))?;
    fs::write(path, json + "\n")
        .await
        .map_err(|error| ProjectError::Internal(error.to_string()))
}

pub(crate) fn item_definition(uuid: Uuid, item: StoredItem) -> ItemDefinition {
    ItemDefinition {
        uuid,
        name: item.name,
        description: item.description,
        capacity: item.capacity,
        auto_use: item.auto_use,
    }
}

pub(crate) fn validate_text(
    requested: &str,
    label: &str,
    maximum: usize,
) -> Result<String, ProjectError> {
    let value = requested.trim();
    if value.is_empty() || value.chars().count() > maximum {
        return Err(ProjectError::InvalidInput(format!(
            "{label} must be between 1 and {maximum} characters."
        )));
    }
    Ok(value.to_owned())
}

pub(crate) fn validate_capacity(capacity: Option<u32>) -> Result<Option<u32>, ProjectError> {
    if capacity == Some(0) || capacity.is_some_and(|value| value > 1_000_000) {
        return Err(ProjectError::InvalidInput(
            "Item capacity must be between 1 and 1000000, or unlimited.".into(),
        ));
    }
    Ok(capacity)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_item_fields() {
        assert_eq!(
            validate_text(" Battery ", "Item name", 80).unwrap(),
            "Battery"
        );
        assert_eq!(validate_capacity(None).unwrap(), None);
        assert_eq!(validate_capacity(Some(10)).unwrap(), Some(10));
        assert!(validate_capacity(Some(0)).is_err());
    }
}
