use tokio::fs;

use crate::ui_templates::validate_variables;
use crate::{Project, ProjectError, ProjectService, UiControls, UiThemeVariables};

impl ProjectService {
    pub async fn update_ui(
        &self,
        project_uuid: &str,
        controls: UiControls,
        variables: UiThemeVariables,
    ) -> Result<Project, ProjectError> {
        let _guard = self.compile_lock.lock().await;
        let mut project = self
            .list()
            .await?
            .into_iter()
            .find(|project| project.uuid.to_string() == project_uuid)
            .ok_or(ProjectError::NotFound)?;
        project.ui.controls = controls.validated()?;
        project.ui.variables = validate_variables(&project.ui.component_set, variables)?;
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
