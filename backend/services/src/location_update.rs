use uuid::Uuid;

use crate::locations::{
    StoredLocation, location_definition, read_locations, validate_text, write_locations,
};
use crate::{LocationDefinition, ProjectError, ProjectService};

impl ProjectService {
    pub async fn update_location(
        &self,
        project_uuid: &str,
        location_uuid: &str,
        requested_title: &str,
        requested_flavour: &str,
    ) -> Result<LocationDefinition, ProjectError> {
        let uuid = Uuid::parse_str(location_uuid)
            .map_err(|_| ProjectError::InvalidInput("Location was not found.".into()))?;
        let stored = StoredLocation {
            title: validate_text(requested_title, "Location title", 80)?,
            flavour: validate_text(requested_flavour, "Location flavour", 500)?,
        };
        let _guard = self.locations_lock.lock().await;
        let path = self.project_dir(project_uuid).await?.join("locations.json");
        let mut locations = read_locations(&path).await?;
        if !locations.contains_key(&uuid) {
            return Err(ProjectError::InvalidInput("Location was not found.".into()));
        }
        let location = location_definition(uuid, stored.clone());
        locations.insert(uuid, stored);
        write_locations(&path, &locations).await?;
        Ok(location)
    }
}
