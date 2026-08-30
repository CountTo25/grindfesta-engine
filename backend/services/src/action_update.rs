use uuid::Uuid;

use crate::action_conditions::validate_condition_join;
use crate::action_fields::{validate_repetition, validate_text, validate_weight};
use crate::actions::{StoredAction, action_definition, read_actions, write_actions};
use crate::{
    ActionCondition, ActionDefinition, ActionEffect, ActionRevealCondition, ProjectError,
    ProjectService,
};

impl ProjectService {
    #[allow(clippy::too_many_arguments)]
    pub async fn update_action(
        &self,
        project_uuid: &str,
        action_uuid: &str,
        requested_title: &str,
        requested_flavour: &str,
        requested_weight: f64,
        repeatable: bool,
        stop_on_repeat: bool,
        required_skill: &str,
        requested_condition_join: &str,
        requested_conditions: Vec<ActionCondition>,
        requested_reveal_conditions: Vec<ActionRevealCondition>,
        requested_completion_effects: Vec<ActionEffect>,
    ) -> Result<ActionDefinition, ProjectError> {
        let action_uuid = Uuid::parse_str(action_uuid)
            .map_err(|_| ProjectError::InvalidInput("Action was not found.".into()))?;
        let required_skill = Uuid::parse_str(required_skill)
            .map_err(|_| ProjectError::InvalidInput("Required skill was not found.".into()))?;
        if !self
            .list_skills(project_uuid)
            .await?
            .iter()
            .any(|skill| skill.uuid == required_skill)
        {
            return Err(ProjectError::InvalidInput(
                "Required skill was not found.".into(),
            ));
        }
        validate_repetition(repeatable, stop_on_repeat)?;
        let stored = StoredAction {
            title: validate_text(requested_title, "Action title", 80)?,
            flavour: validate_text(requested_flavour, "Action flavour", 500)?,
            weight: validate_weight(requested_weight)?,
            repeatable,
            stop_on_repeat,
            required_skill,
            condition_join: validate_condition_join(requested_condition_join)?,
            conditions: self
                .validate_action_conditions(project_uuid, requested_conditions)
                .await?,
            reveal_conditions: self
                .validate_action_reveals(project_uuid, requested_reveal_conditions)
                .await?,
            completion_effects: self
                .validate_action_effects(project_uuid, requested_completion_effects)
                .await?,
        };
        let _guard = self.actions_lock.lock().await;
        let path = self.project_dir(project_uuid).await?.join("actions.json");
        let mut actions = read_actions(&path).await?;
        if !actions.contains_key(&action_uuid) {
            return Err(ProjectError::InvalidInput("Action was not found.".into()));
        }
        let action = action_definition(action_uuid, stored.clone());
        actions.insert(action_uuid, stored);
        write_actions(&path, &actions).await?;
        Ok(action)
    }
}
