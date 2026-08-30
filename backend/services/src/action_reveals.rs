use serde::{Deserialize, Serialize};

use crate::action_fields::validate_text;
use crate::{ActionCondition, ProjectError, ProjectService};

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionRevealCondition {
    #[serde(flatten)]
    pub condition: ActionCondition,
    pub description: String,
}

impl ProjectService {
    pub(crate) async fn validate_action_reveals(
        &self,
        project_uuid: &str,
        requested: Vec<ActionRevealCondition>,
    ) -> Result<Vec<ActionRevealCondition>, ProjectError> {
        if requested.len() > 32 {
            return Err(ProjectError::InvalidInput(
                "An action can have at most 32 reveal conditions.".into(),
            ));
        }
        let (conditions, descriptions): (Vec<_>, Vec<_>) = requested
            .into_iter()
            .map(|reveal| (reveal.condition, reveal.description))
            .unzip();
        let conditions = self
            .validate_action_conditions(project_uuid, conditions)
            .await?;
        conditions
            .into_iter()
            .zip(descriptions)
            .map(|(condition, description)| {
                Ok(ActionRevealCondition {
                    condition,
                    description: validate_text(&description, "Reveal description", 200)?,
                })
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reveal_condition_serializes_as_a_flat_authored_rule() {
        let reveal = ActionRevealCondition {
            condition: ActionCondition {
                condition: "hasFlag".into(),
                value: "flag-id".into(),
                not: false,
                amount: None,
                comparison_value: None,
                check: None,
            },
            description: "Find a reason to leave.".into(),
        };
        let json = serde_json::to_value(reveal).unwrap();
        assert_eq!(json["condition"], "hasFlag");
        assert_eq!(json["description"], "Find a reason to leave.");
    }
}
