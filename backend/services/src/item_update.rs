use uuid::Uuid;

use crate::item_auto_use::validate_auto_use;
use crate::items::{
    StoredItem, item_definition, read_items, validate_capacity, validate_text, write_items,
};
use crate::{ItemAutoUse, ItemDefinition, ProjectError, ProjectService};

impl ProjectService {
    pub async fn update_item(
        &self,
        project_uuid: &str,
        item_uuid: &str,
        requested_name: &str,
        requested_description: &str,
        requested_capacity: Option<u32>,
        requested_auto_use: Option<ItemAutoUse>,
    ) -> Result<ItemDefinition, ProjectError> {
        let uuid = Uuid::parse_str(item_uuid)
            .map_err(|_| ProjectError::InvalidInput("Item was not found.".into()))?;
        let stored = StoredItem {
            name: validate_text(requested_name, "Item name", 80)?,
            description: validate_text(requested_description, "Item description", 500)?,
            capacity: validate_capacity(requested_capacity)?,
            auto_use: validate_auto_use(requested_auto_use)?,
        };
        let _guard = self.items_lock.lock().await;
        let path = self.project_dir(project_uuid).await?.join("items.json");
        let mut items = read_items(&path).await?;
        if !items.contains_key(&uuid) {
            return Err(ProjectError::InvalidInput("Item was not found.".into()));
        }
        if items.iter().any(|(other_uuid, item)| {
            *other_uuid != uuid && item.name.eq_ignore_ascii_case(&stored.name)
        }) {
            return Err(ProjectError::InvalidInput(
                "An item with this name already exists.".into(),
            ));
        }
        let item = item_definition(uuid, stored.clone());
        items.insert(uuid, stored);
        write_items(&path, &items).await?;
        Ok(item)
    }
}
