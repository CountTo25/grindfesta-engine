use uuid::Uuid;

use crate::actions::{read_actions, write_actions};
use crate::flag_references::repair_flag_references;
use crate::flags::{StoredFlag, definition, read_flags, validate_name, write_flags};
use crate::project_migrations::{ProjectMigration, read_migrations, write_migrations};
use crate::{FlagDefinition, FlagValueType, ProjectError, ProjectService};

impl ProjectService {
    pub async fn update_flag(
        &self,
        project_uuid: &str,
        flag_uuid: &str,
        requested_name: &str,
        value_type: FlagValueType,
    ) -> Result<FlagDefinition, ProjectError> {
        let uuid = Uuid::parse_str(flag_uuid)
            .map_err(|_| ProjectError::InvalidInput("Flag was not found.".into()))?;
        let name = validate_name(requested_name)?;
        let _flags_guard = self.flags_lock.lock().await;
        let _actions_guard = self.actions_lock.lock().await;
        let _migrations_guard = self.migrations_lock.lock().await;
        let root = self.project_dir(project_uuid).await?;
        let flags_path = root.join("flags.json");
        let actions_path = root.join("actions.json");
        let migrations_path = root.join("migrations.json");
        let mut flags = read_flags(&flags_path).await?;
        let previous = flags
            .get(&uuid)
            .cloned()
            .ok_or_else(|| ProjectError::InvalidInput("Flag was not found.".into()))?;
        if flags
            .iter()
            .any(|(other_uuid, flag)| *other_uuid != uuid && flag.name.eq_ignore_ascii_case(&name))
        {
            return Err(ProjectError::InvalidInput(
                "A flag with this name already exists.".into(),
            ));
        }
        let stored = StoredFlag { name, value_type };
        let updated = definition((uuid, stored.clone()));
        flags.insert(uuid, stored);
        if previous.value_type == value_type {
            write_flags(&flags_path, &flags).await?;
            return Ok(updated);
        }

        let mut actions = read_actions(&actions_path).await?;
        repair_flag_references(&mut actions, uuid, value_type);
        let mut migrations = read_migrations(&migrations_path).await?;
        migrations.push(ProjectMigration::flag_type_change(
            uuid,
            previous.value_type,
            value_type,
        ));
        write_flags(&flags_path, &flags).await?;
        write_actions(&actions_path, &actions).await?;
        write_migrations(&migrations_path, &migrations).await?;
        Ok(updated)
    }
}
