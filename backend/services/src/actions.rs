use std::{collections::BTreeMap, io::ErrorKind, path::Path};

use serde::{Deserialize, Serialize};
use tokio::fs;
use uuid::Uuid;

use crate::action_conditions::validate_condition_join;
use crate::action_fields::{validate_repetition, validate_text, validate_weight};
use crate::{ActionCondition, ActionEffect, ActionRevealCondition, ProjectError, ProjectService};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionDefinition {
    pub uuid: Uuid,
    pub title: String,
    pub flavour: String,
    pub weight: f64,
    pub repeatable: bool,
    pub stop_on_repeat: bool,
    pub required_skill: Uuid,
    pub condition_join: String,
    pub conditions: Vec<ActionCondition>,
    pub reveal_conditions: Vec<ActionRevealCondition>,
    pub completion_effects: Vec<ActionEffect>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StoredAction {
    pub(crate) title: String,
    pub(crate) flavour: String,
    pub(crate) weight: f64,
    #[serde(default)]
    pub(crate) repeatable: bool,
    #[serde(default)]
    pub(crate) stop_on_repeat: bool,
    pub(crate) required_skill: Uuid,
    #[serde(default = "default_condition_join")]
    pub(crate) condition_join: String,
    #[serde(default)]
    pub(crate) conditions: Vec<ActionCondition>,
    #[serde(default)]
    pub(crate) reveal_conditions: Vec<ActionRevealCondition>,
    #[serde(default)]
    pub(crate) completion_effects: Vec<ActionEffect>,
}

impl ProjectService {
    pub async fn list_actions(
        &self,
        project_uuid: &str,
    ) -> Result<Vec<ActionDefinition>, ProjectError> {
        let _guard = self.actions_lock.lock().await;
        let project_dir = self.project_dir(project_uuid).await?;
        let actions = read_actions(&project_dir.join("actions.json")).await?;
        Ok(actions
            .into_iter()
            .map(|(uuid, action)| action_definition(uuid, action))
            .collect())
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn create_action(
        &self,
        project_uuid: &str,
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
        let title = validate_text(requested_title, "Action title", 80)?;
        let flavour = validate_text(requested_flavour, "Action flavour", 500)?;
        let weight = validate_weight(requested_weight)?;
        validate_repetition(repeatable, stop_on_repeat)?;
        let condition_join = validate_condition_join(requested_condition_join)?;
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
        let conditions = self
            .validate_action_conditions(project_uuid, requested_conditions)
            .await?;
        let reveal_conditions = self
            .validate_action_reveals(project_uuid, requested_reveal_conditions)
            .await?;
        let completion_effects = self
            .validate_action_effects(project_uuid, requested_completion_effects)
            .await?;

        let _guard = self.actions_lock.lock().await;
        let project_dir = self.project_dir(project_uuid).await?;
        let path = project_dir.join("actions.json");
        let mut actions = read_actions(&path).await?;
        let uuid = Uuid::new_v4();
        let stored = StoredAction {
            title,
            flavour,
            weight,
            repeatable,
            stop_on_repeat,
            required_skill,
            condition_join,
            conditions,
            reveal_conditions,
            completion_effects,
        };
        let action = action_definition(uuid, stored.clone());
        actions.insert(uuid, stored);
        write_actions(&path, &actions).await?;
        Ok(action)
    }
}

pub(crate) async fn read_actions(
    path: &Path,
) -> Result<BTreeMap<Uuid, StoredAction>, ProjectError> {
    let json = match fs::read_to_string(path).await {
        Ok(json) => json,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(BTreeMap::new()),
        Err(error) => return Err(ProjectError::Internal(error.to_string())),
    };
    serde_json::from_str(&json).map_err(|error| ProjectError::Internal(error.to_string()))
}

pub(crate) async fn write_actions(
    path: &Path,
    actions: &BTreeMap<Uuid, StoredAction>,
) -> Result<(), ProjectError> {
    let json = serde_json::to_string_pretty(actions)
        .map_err(|error| ProjectError::Internal(error.to_string()))?;
    fs::write(path, json + "\n")
        .await
        .map_err(|error| ProjectError::Internal(error.to_string()))
}

pub(crate) fn action_definition(uuid: Uuid, action: StoredAction) -> ActionDefinition {
    ActionDefinition {
        uuid,
        title: action.title,
        flavour: action.flavour,
        weight: action.weight,
        repeatable: action.repeatable,
        stop_on_repeat: action.stop_on_repeat,
        required_skill: action.required_skill,
        condition_join: action.condition_join,
        conditions: action.conditions,
        reveal_conditions: action.reveal_conditions,
        completion_effects: action.completion_effects,
    }
}

fn default_condition_join() -> String {
    "and".into()
}
