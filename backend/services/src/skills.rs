use std::{io::ErrorKind, path::Path};

use serde::{Deserialize, Serialize};
use tokio::fs;
use uuid::Uuid;

use crate::{ProjectError, ProjectService};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct SkillDefinition {
    #[serde(default)]
    pub uuid: Uuid,
    pub name: String,
    pub icon: String,
}

impl ProjectService {
    pub async fn list_skills(
        &self,
        project_uuid: &str,
    ) -> Result<Vec<SkillDefinition>, ProjectError> {
        let _guard = self.skills_lock.lock().await;
        let project_dir = self.project_dir(project_uuid).await?;
        let path = project_dir.join("skills.json");
        let mut skills = read_skills(&path).await?;
        if assign_missing_uuids(&mut skills) {
            write_skills(&path, &skills).await?;
        }
        Ok(skills)
    }

    pub async fn create_skill(
        &self,
        project_uuid: &str,
        requested_name: &str,
        requested_icon: &str,
    ) -> Result<SkillDefinition, ProjectError> {
        let name = validate_skill_name(requested_name)?;
        let icon = validate_skill_icon(requested_icon)?;
        let _guard = self.skills_lock.lock().await;
        let project_dir = self.project_dir(project_uuid).await?;
        let path = project_dir.join("skills.json");
        let mut skills = read_skills(&path).await?;
        assign_missing_uuids(&mut skills);

        if skills
            .iter()
            .any(|skill| skill.name.eq_ignore_ascii_case(&name))
        {
            return Err(ProjectError::InvalidInput(
                "A skill with this name already exists.".into(),
            ));
        }

        let skill = SkillDefinition {
            uuid: Uuid::new_v4(),
            name,
            icon,
        };
        skills.push(skill.clone());
        write_skills(&path, &skills).await?;

        Ok(skill)
    }

    pub async fn update_skill(
        &self,
        project_uuid: &str,
        skill_uuid: &str,
        requested_name: &str,
        requested_icon: Option<&str>,
    ) -> Result<SkillDefinition, ProjectError> {
        let name = validate_skill_name(requested_name)?;
        let icon = requested_icon.map(validate_skill_icon).transpose()?;
        let skill_uuid = Uuid::parse_str(skill_uuid)
            .map_err(|_| ProjectError::InvalidInput("Skill was not found.".into()))?;
        let _guard = self.skills_lock.lock().await;
        let project_dir = self.project_dir(project_uuid).await?;
        let path = project_dir.join("skills.json");
        let mut skills = read_skills(&path).await?;
        assign_missing_uuids(&mut skills);
        let index = skills
            .iter()
            .position(|skill| skill.uuid == skill_uuid)
            .ok_or_else(|| ProjectError::InvalidInput("Skill was not found.".into()))?;

        if skills.iter().enumerate().any(|(other_index, skill)| {
            other_index != index && skill.name.eq_ignore_ascii_case(&name)
        }) {
            return Err(ProjectError::InvalidInput(
                "A skill with this name already exists.".into(),
            ));
        }

        skills[index].name = name;
        if let Some(icon) = icon {
            skills[index].icon = icon;
        }
        let skill = skills[index].clone();
        write_skills(&path, &skills).await?;
        Ok(skill)
    }
}

async fn read_skills(path: &Path) -> Result<Vec<SkillDefinition>, ProjectError> {
    let json = match fs::read_to_string(path).await {
        Ok(json) => json,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => return Err(ProjectError::Internal(error.to_string())),
    };
    serde_json::from_str(&json).map_err(|error| ProjectError::Internal(error.to_string()))
}

async fn write_skills(path: &Path, skills: &[SkillDefinition]) -> Result<(), ProjectError> {
    let json = serde_json::to_string_pretty(skills)
        .map_err(|error| ProjectError::Internal(error.to_string()))?;
    fs::write(path, json + "\n")
        .await
        .map_err(|error| ProjectError::Internal(error.to_string()))
}

fn assign_missing_uuids(skills: &mut [SkillDefinition]) -> bool {
    let mut changed = false;
    for skill in skills.iter_mut().filter(|skill| skill.uuid.is_nil()) {
        skill.uuid = Uuid::new_v4();
        changed = true;
    }
    changed
}

fn validate_skill_name(requested_name: &str) -> Result<String, ProjectError> {
    let name = requested_name.trim();
    if name.is_empty() {
        return Err(ProjectError::InvalidInput("Skill name is required.".into()));
    }
    if name.chars().count() > 80 {
        return Err(ProjectError::InvalidInput(
            "Skill name must be 80 characters or fewer.".into(),
        ));
    }
    Ok(name.to_owned())
}

fn validate_skill_icon(requested_icon: &str) -> Result<String, ProjectError> {
    let icon = requested_icon.trim();
    if icon.len() > 240
        || !icon.chars().all(|character| {
            character.is_ascii_alphanumeric()
                || character.is_ascii_whitespace()
                || matches!(character, '-' | '_')
        })
    {
        return Err(ProjectError::InvalidInput(
            "Icon classes contain unsupported characters.".into(),
        ));
    }
    Ok(icon.split_whitespace().collect::<Vec<_>>().join(" "))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_skill_names() {
        assert_eq!(validate_skill_name("  Mining  ").unwrap(), "Mining");
        assert!(validate_skill_name(" ").is_err());
        assert!(validate_skill_name(&"x".repeat(81)).is_err());
        assert_eq!(
            validate_skill_icon(" fa-solid   fa-hammer ").unwrap(),
            "fa-solid fa-hammer"
        );
        assert!(validate_skill_icon("fa-user\"").is_err());
    }

    #[test]
    fn assigns_uuids_to_legacy_skills() {
        let mut skills: Vec<SkillDefinition> =
            serde_json::from_str(r#"[{"name":"Mining","icon":""}]"#).unwrap();
        assert!(assign_missing_uuids(&mut skills));
        assert!(!skills[0].uuid.is_nil());
        assert!(!assign_missing_uuids(&mut skills));
    }
}
