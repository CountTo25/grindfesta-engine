use std::{collections::BTreeMap, io::ErrorKind, path::Path};

use serde::{Deserialize, Serialize};
use tokio::fs;
use uuid::Uuid;

use crate::{ProjectError, ProjectService};

#[derive(Clone, Debug, Serialize)]
pub struct LocationDefinition {
    pub uuid: Uuid,
    pub title: String,
    pub flavour: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub(crate) struct StoredLocation {
    pub(crate) title: String,
    pub(crate) flavour: String,
}

impl ProjectService {
    pub async fn list_locations(
        &self,
        project_uuid: &str,
    ) -> Result<Vec<LocationDefinition>, ProjectError> {
        let _guard = self.locations_lock.lock().await;
        let project_dir = self.project_dir(project_uuid).await?;
        let locations = read_locations(&project_dir.join("locations.json")).await?;
        Ok(locations
            .into_iter()
            .map(|(uuid, location)| location_definition(uuid, location))
            .collect())
    }

    pub async fn create_location(
        &self,
        project_uuid: &str,
        requested_title: &str,
        requested_flavour: &str,
    ) -> Result<LocationDefinition, ProjectError> {
        let title = validate_text(requested_title, "Location title", 80)?;
        let flavour = validate_text(requested_flavour, "Location flavour", 500)?;
        let _guard = self.locations_lock.lock().await;
        let project_dir = self.project_dir(project_uuid).await?;
        let path = project_dir.join("locations.json");
        let mut locations = read_locations(&path).await?;
        let uuid = Uuid::new_v4();
        let stored = StoredLocation { title, flavour };
        let location = location_definition(uuid, stored.clone());
        locations.insert(uuid, stored);
        write_locations(&path, &locations).await?;
        Ok(location)
    }
}

pub(crate) async fn read_locations(
    path: &Path,
) -> Result<BTreeMap<Uuid, StoredLocation>, ProjectError> {
    let json = match fs::read_to_string(path).await {
        Ok(json) => json,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(BTreeMap::new()),
        Err(error) => return Err(ProjectError::Internal(error.to_string())),
    };
    serde_json::from_str(&json).map_err(|error| ProjectError::Internal(error.to_string()))
}

pub(crate) async fn write_locations(
    path: &Path,
    locations: &BTreeMap<Uuid, StoredLocation>,
) -> Result<(), ProjectError> {
    let json = serde_json::to_string_pretty(locations)
        .map_err(|error| ProjectError::Internal(error.to_string()))?;
    fs::write(path, json + "\n")
        .await
        .map_err(|error| ProjectError::Internal(error.to_string()))
}

pub(crate) fn location_definition(uuid: Uuid, location: StoredLocation) -> LocationDefinition {
    LocationDefinition {
        uuid,
        title: location.title,
        flavour: location.flavour,
    }
}

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_location_fields() {
        assert_eq!(
            validate_text("  Old forest  ", "Location title", 80).unwrap(),
            "Old forest"
        );
        assert!(validate_text(" ", "Location title", 80).is_err());
        assert!(validate_text(&"x".repeat(81), "Location title", 80).is_err());
    }
}
