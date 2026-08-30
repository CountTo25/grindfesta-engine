use tokio::fs;

use crate::{EngineVariables, Project, ProjectError, ProjectService};

impl ProjectService {
    pub async fn update_engine_variables(
        &self,
        project_uuid: &str,
        variables: EngineVariables,
    ) -> Result<Project, ProjectError> {
        let _guard = self.compile_lock.lock().await;
        let mut project = self
            .list()
            .await?
            .into_iter()
            .find(|project| project.uuid.to_string() == project_uuid)
            .ok_or(ProjectError::NotFound)?;
        project.engine_variables = variables.validated()?;
        let directory = self.project_dir(project_uuid).await?;
        let manifest = project
            .manifest_json()
            .map_err(|error| ProjectError::Internal(error.to_string()))?;
        fs::write(directory.join("project.json"), manifest + "\n")
            .await
            .map_err(|error| ProjectError::Internal(error.to_string()))?;
        Ok(project)
    }
}
