use serde::{Deserialize, Serialize};

use crate::ProjectError;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemAutoUse {
    pub cooldown_ms: u32,
    pub conditions: Vec<ItemUseCondition>,
    pub effects: Vec<ItemUseEffect>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ItemUseCondition {
    pub condition: String,
    pub value: f64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ItemUseEffect {
    pub effect: String,
    pub value: f64,
}

pub(crate) fn validate_auto_use(
    auto_use: Option<ItemAutoUse>,
) -> Result<Option<ItemAutoUse>, ProjectError> {
    let Some(auto_use) = auto_use else {
        return Ok(None);
    };
    if auto_use.cooldown_ms > 86_400_000 {
        return Err(invalid("Auto-use cooldown cannot exceed 24 hours."));
    }
    if auto_use.conditions.is_empty() || auto_use.effects.is_empty() {
        return Err(invalid("Auto-use requires a condition and an effect."));
    }
    for condition in &auto_use.conditions {
        if condition.condition != "energyMissing" {
            return Err(invalid("Unknown item auto-use condition."));
        }
        validate_value(condition.value, "Missing energy")?;
    }
    for effect in &auto_use.effects {
        if effect.effect != "restoreEnergy" {
            return Err(invalid("Unknown item auto-use effect."));
        }
        validate_value(effect.value, "Restored energy")?;
    }
    Ok(Some(auto_use))
}

fn validate_value(value: f64, label: &str) -> Result<(), ProjectError> {
    if !value.is_finite() || value <= 0.0 || value > 1_000_000.0 {
        return Err(invalid(&format!(
            "{label} must be greater than 0 and no more than 1000000."
        )));
    }
    Ok(())
}

fn invalid(message: &str) -> ProjectError {
    ProjectError::InvalidInput(message.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_battery_auto_use() {
        let battery = ItemAutoUse {
            cooldown_ms: 5_000,
            conditions: vec![ItemUseCondition {
                condition: "energyMissing".into(),
                value: 1.0,
            }],
            effects: vec![ItemUseEffect {
                effect: "restoreEnergy".into(),
                value: 1.0,
            }],
        };
        assert!(validate_auto_use(Some(battery)).is_ok());
    }
}
