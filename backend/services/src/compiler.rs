use serde::Serialize;
use tokio::fs;
use uuid::Uuid;

use crate::compiler_io::run_bun_stage;
use crate::compiler_progress::BuildReporter;
use crate::compiler_scaffold::write_game_scaffold;
use crate::game_codegen::generate_game_modules;
use crate::ui_templates::compiler_replacements;
use crate::{App, ProjectError};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompiledProject {
    pub project_uuid: Uuid,
    pub output_path: String,
    pub entry_path: String,
    pub launch_path: String,
}

impl App {
    pub async fn compile_project(
        &self,
        requested_uuid: &str,
        reporter: BuildReporter,
    ) -> Result<CompiledProject, ProjectError> {
        reporter.running("preparing", "Reading project definitions");
        let project_uuid = Uuid::parse_str(requested_uuid).map_err(|_| ProjectError::NotFound)?;
        let _guard = self.projects().compile_lock.lock().await;
        let project = self
            .projects()
            .list()
            .await?
            .into_iter()
            .find(|project| project.uuid == project_uuid)
            .ok_or(ProjectError::NotFound)?;
        let skills = self.projects().list_skills(requested_uuid).await?;
        let locations = self.projects().list_locations(requested_uuid).await?;
        let items = self.projects().list_items(requested_uuid).await?;
        let flags = self.projects().list_flags(requested_uuid).await?;
        let migrations = self.projects().list_migrations(requested_uuid).await?;
        let actions = self.projects().list_actions(requested_uuid).await?;
        if skills.is_empty() {
            return invalid("Add at least one skill before building the game.");
        }
        if locations.is_empty() {
            return invalid("Add at least one location before building the game.");
        }
        if project.ui.component_set != "glass" {
            return invalid("The selected UI template cannot be compiled.");
        }
        let libraries = self.list_icon_libraries(requested_uuid).await?;
        let replacements = compiler_replacements(&project.ui);
        reporter.completed("preparing", "Project definitions are ready");
        let project_dir = self.projects().project_dir(requested_uuid).await?;
        let temporary = project_dir.join(format!(".generated-{}", Uuid::new_v4()));
        let output = project_dir.join("generated");
        reporter.running(
            "generating",
            "Compiling project JSON into TypeScript modules",
        );
        let game_modules = match generate_game_modules(
            &project,
            &skills,
            &locations,
            &actions,
            &items,
            &flags,
            &migrations,
        ) {
            Ok(modules) => modules,
            Err(error) => {
                reporter.failed("generating", error.to_string());
                return Err(error);
            }
        };
        reporter.completed(
            "generating",
            format!(
                "Generated engine variables, {} skills, {} locations, {} items, {} flags, {} migrations, and {} actions",
                skills.len(),
                locations.len(),
                items.len(),
                flags.len(),
                migrations.len(),
                actions.len()
            ),
        );

        let result = async {
            reporter.running(
                "scaffolding",
                "Writing engine, UI, and generated source files",
            );
            fs::create_dir_all(&temporary).await.map_err(internal)?;
            write_game_scaffold(&temporary, &game_modules, &libraries, &replacements).await?;
            reporter.completed("scaffolding", "Standalone game source is assembled");
            run_bun_stage(
                &temporary,
                &["install"],
                &reporter,
                "dependencies",
                "Installing generated game dependencies",
                "Dependencies installed",
            )
            .await?;
            run_bun_stage(
                &temporary,
                &["run", "check"],
                &reporter,
                "checking",
                "Checking generated TypeScript and Svelte source",
                "Generated source passed validation",
            )
            .await?;
            run_bun_stage(
                &temporary,
                &["run", "build"],
                &reporter,
                "bundling",
                "Bundling the production game",
                "Production bundle created",
            )
            .await
        }
        .await;

        if let Err(error) = result {
            reporter.failed("build", error.to_string());
            let _ = fs::remove_dir_all(&temporary).await;
            return Err(error);
        }
        reporter.running("publishing", "Publishing generated artifacts");
        if fs::try_exists(&output).await.map_err(internal)? {
            fs::remove_dir_all(&output).await.map_err(internal)?;
        }
        fs::rename(&temporary, &output).await.map_err(internal)?;
        reporter.completed("publishing", "Generated artifacts are ready");
        reporter.completed("complete", "Game build completed");
        Ok(CompiledProject {
            project_uuid,
            output_path: output.to_string_lossy().into_owned(),
            entry_path: output
                .join("dist/index.html")
                .to_string_lossy()
                .into_owned(),
            launch_path: format!("/projects/{project_uuid}/game/"),
        })
    }
}

fn internal(error: impl ToString) -> ProjectError {
    ProjectError::Internal(error.to_string())
}

fn invalid<Value>(message: &str) -> Result<Value, ProjectError> {
    Err(ProjectError::InvalidInput(message.into()))
}
