use std::{io::ErrorKind, path::Path};

use serde::{Deserialize, Serialize};
use tokio::fs;
use uuid::Uuid;

use crate::{FlagValueType, ProjectError, ProjectService};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMigration {
    pub migration_id: Uuid,
    pub changes: Vec<MigrationChange>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum MigrationChange {
    FlagTypeChange {
        #[serde(rename = "flagUuid")]
        flag_uuid: Uuid,
        from: FlagValueType,
        to: FlagValueType,
    },
}

impl ProjectMigration {
    pub(crate) fn flag_type_change(
        flag_uuid: Uuid,
        from: FlagValueType,
        to: FlagValueType,
    ) -> Self {
        Self {
            migration_id: Uuid::new_v4(),
            changes: vec![MigrationChange::FlagTypeChange {
                flag_uuid,
                from,
                to,
            }],
        }
    }
}

impl ProjectService {
    pub async fn list_migrations(
        &self,
        project_uuid: &str,
    ) -> Result<Vec<ProjectMigration>, ProjectError> {
        let _guard = self.migrations_lock.lock().await;
        let path = self
            .project_dir(project_uuid)
            .await?
            .join("migrations.json");
        read_migrations(&path).await
    }
}

pub(crate) async fn read_migrations(path: &Path) -> Result<Vec<ProjectMigration>, ProjectError> {
    let json = match fs::read_to_string(path).await {
        Ok(json) => json,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => return Err(ProjectError::Internal(error.to_string())),
    };
    serde_json::from_str(&json).map_err(|error| ProjectError::Internal(error.to_string()))
}

pub(crate) async fn write_migrations(
    path: &Path,
    migrations: &[ProjectMigration],
) -> Result<(), ProjectError> {
    let json = serde_json::to_string_pretty(migrations)
        .map_err(|error| ProjectError::Internal(error.to_string()))?;
    fs::write(path, json + "\n")
        .await
        .map_err(|error| ProjectError::Internal(error.to_string()))
}
