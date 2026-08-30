use std::{path::PathBuf, sync::Arc};

use tokio::fs;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::{Project, ProjectError};

#[derive(Clone)]
pub struct ProjectService {
    root: PathBuf,
    pub(crate) skills_lock: Arc<Mutex<()>>,
    pub(crate) locations_lock: Arc<Mutex<()>>,
    pub(crate) items_lock: Arc<Mutex<()>>,
    pub(crate) flags_lock: Arc<Mutex<()>>,
    pub(crate) migrations_lock: Arc<Mutex<()>>,
    pub(crate) actions_lock: Arc<Mutex<()>>,
    pub(crate) compile_lock: Arc<Mutex<()>>,
}

impl ProjectService {
    pub async fn new() -> Result<Self, ProjectError> {
        let binary =
            std::env::current_exe().map_err(|error| ProjectError::Internal(error.to_string()))?;
        let binary_dir = binary.parent().ok_or_else(|| {
            ProjectError::Internal("binary directory could not be resolved".into())
        })?;
        let root = binary_dir.join("projects");

        fs::create_dir_all(&root)
            .await
            .map_err(|error| ProjectError::Internal(error.to_string()))?;

        Ok(Self {
            root,
            skills_lock: Arc::new(Mutex::new(())),
            locations_lock: Arc::new(Mutex::new(())),
            items_lock: Arc::new(Mutex::new(())),
            flags_lock: Arc::new(Mutex::new(())),
            migrations_lock: Arc::new(Mutex::new(())),
            actions_lock: Arc::new(Mutex::new(())),
            compile_lock: Arc::new(Mutex::new(())),
        })
    }

    pub async fn list(&self) -> Result<Vec<Project>, ProjectError> {
        let mut entries = fs::read_dir(&self.root)
            .await
            .map_err(|error| ProjectError::Internal(error.to_string()))?;
        let mut projects: Vec<Project> = Vec::new();

        while let Some(entry) = entries
            .next_entry()
            .await
            .map_err(|error| ProjectError::Internal(error.to_string()))?
        {
            let file_type = match entry.file_type().await {
                Ok(file_type) => file_type,
                Err(_) => continue,
            };
            if !file_type.is_dir() {
                continue;
            }
            let manifest = match fs::read_to_string(entry.path().join("project.json")).await {
                Ok(manifest) => manifest,
                Err(_) => continue,
            };
            let schema = match fs::read_to_string(entry.path().join("schema.json")).await {
                Ok(schema) => schema,
                Err(_) => continue,
            };
            if let Ok(project) = Project::from_json(&manifest, &schema) {
                projects.push(project);
            }
        }

        projects.sort_by_key(|project| project.name.to_lowercase());
        Ok(projects)
    }

    pub async fn create(
        &self,
        requested_name: &str,
        requested_description: &str,
        requested_component_set: &str,
    ) -> Result<Project, ProjectError> {
        let project = Project::validated(
            requested_name,
            requested_description,
            requested_component_set,
        )?;
        let project_dir = self.root.join(&project.name);

        match fs::create_dir(&project_dir).await {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
                return Err(ProjectError::AlreadyExists);
            }
            Err(error) => return Err(ProjectError::Internal(error.to_string())),
        }

        if let Err(error) = write_project_files(&project_dir, &project).await {
            cleanup_project_files(&project_dir).await;
            return Err(ProjectError::Internal(error.to_string()));
        }

        Ok(project)
    }

    pub async fn project_dir(&self, project_uuid: &str) -> Result<PathBuf, ProjectError> {
        let project_uuid = Uuid::parse_str(project_uuid).map_err(|_| ProjectError::NotFound)?;
        let mut entries = fs::read_dir(&self.root)
            .await
            .map_err(|error| ProjectError::Internal(error.to_string()))?;

        while let Some(entry) = entries
            .next_entry()
            .await
            .map_err(|error| ProjectError::Internal(error.to_string()))?
        {
            let schema = match fs::read_to_string(entry.path().join("schema.json")).await {
                Ok(schema) => schema,
                Err(_) => continue,
            };
            if Project::uuid_from_schema(&schema).ok() == Some(project_uuid) {
                return Ok(entry.path());
            }
        }

        Err(ProjectError::NotFound)
    }
}

async fn write_project_files(project_dir: &PathBuf, project: &Project) -> Result<(), ProjectError> {
    let manifest = project
        .manifest_json()
        .map_err(|error| ProjectError::Internal(error.to_string()))?;
    let schema = project
        .schema_json()
        .map_err(|error| ProjectError::Internal(error.to_string()))?;

    fs::write(project_dir.join("project.json"), manifest + "\n")
        .await
        .map_err(|error| ProjectError::Internal(error.to_string()))?;
    fs::write(project_dir.join("schema.json"), schema + "\n")
        .await
        .map_err(|error| ProjectError::Internal(error.to_string()))?;
    fs::write(project_dir.join("skills.json"), "[]\n")
        .await
        .map_err(|error| ProjectError::Internal(error.to_string()))?;
    fs::write(project_dir.join("locations.json"), "{}\n")
        .await
        .map_err(|error| ProjectError::Internal(error.to_string()))?;
    fs::write(project_dir.join("items.json"), "{}\n")
        .await
        .map_err(|error| ProjectError::Internal(error.to_string()))?;
    fs::write(project_dir.join("flags.json"), "{}\n")
        .await
        .map_err(|error| ProjectError::Internal(error.to_string()))?;
    fs::write(project_dir.join("migrations.json"), "[]\n")
        .await
        .map_err(|error| ProjectError::Internal(error.to_string()))?;
    fs::write(project_dir.join("actions.json"), "{}\n")
        .await
        .map_err(|error| ProjectError::Internal(error.to_string()))?;
    Ok(())
}

async fn cleanup_project_files(project_dir: &PathBuf) {
    let _ = fs::remove_file(project_dir.join("project.json")).await;
    let _ = fs::remove_file(project_dir.join("schema.json")).await;
    let _ = fs::remove_file(project_dir.join("skills.json")).await;
    let _ = fs::remove_file(project_dir.join("locations.json")).await;
    let _ = fs::remove_file(project_dir.join("items.json")).await;
    let _ = fs::remove_file(project_dir.join("flags.json")).await;
    let _ = fs::remove_file(project_dir.join("migrations.json")).await;
    let _ = fs::remove_file(project_dir.join("actions.json")).await;
    let _ = fs::remove_dir(project_dir).await;
}
