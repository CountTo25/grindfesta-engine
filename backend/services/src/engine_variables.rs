use serde::{Deserialize, Serialize};

use crate::ProjectError;

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(default, rename_all = "camelCase")]
pub struct EngineVariables {
    pub base_energy_capacity: f64,
    pub initial_energy_decay_rate: f64,
    pub energy_decay_doubling_seconds: f64,
    pub energy_drain_multiplier: f64,
    pub ticks_per_second: u32,
    pub base_action_progress_per_second: f64,
    pub run_skill_base_experience: f64,
    pub run_skill_experience_growth: f64,
    pub run_skill_level_modifier: f64,
    pub persistent_skill_base_experience: f64,
    pub persistent_skill_experience_growth: f64,
    pub persistent_skill_level_modifier: f64,
}

impl Default for EngineVariables {
    fn default() -> Self {
        Self {
            base_energy_capacity: 10.0,
            initial_energy_decay_rate: 0.05,
            energy_decay_doubling_seconds: 180.0,
            energy_drain_multiplier: 1.0,
            ticks_per_second: 20,
            base_action_progress_per_second: 1.0,
            run_skill_base_experience: 9.0,
            run_skill_experience_growth: 1.1,
            run_skill_level_modifier: 1.055,
            persistent_skill_base_experience: 18.0,
            persistent_skill_experience_growth: 1.02,
            persistent_skill_level_modifier: 1.012,
        }
    }
}

impl EngineVariables {
    pub(crate) fn validated(self) -> Result<Self, ProjectError> {
        positive(
            self.base_energy_capacity,
            "Base energy capacity",
            1_000_000.0,
        )?;
        non_negative(
            self.initial_energy_decay_rate,
            "Initial energy decay rate",
            1_000_000.0,
        )?;
        range(
            self.energy_decay_doubling_seconds,
            "Energy decay doubling time",
            0.1,
            31_536_000.0,
        )?;
        non_negative(
            self.energy_drain_multiplier,
            "Energy drain multiplier",
            1_000_000.0,
        )?;
        if !(1..=240).contains(&self.ticks_per_second) {
            return invalid("Ticks per second must be between 1 and 240.");
        }
        positive(
            self.base_action_progress_per_second,
            "Base action progress",
            1_000_000.0,
        )?;
        positive(
            self.run_skill_base_experience,
            "Run skill base experience",
            1_000_000.0,
        )?;
        ratio(
            self.run_skill_experience_growth,
            "Run skill experience growth",
        )?;
        positive(self.run_skill_level_modifier, "Run skill modifier", 100.0)?;
        positive(
            self.persistent_skill_base_experience,
            "Persistent skill base experience",
            1_000_000.0,
        )?;
        ratio(
            self.persistent_skill_experience_growth,
            "Persistent skill experience growth",
        )?;
        positive(
            self.persistent_skill_level_modifier,
            "Persistent skill modifier",
            100.0,
        )?;
        Ok(self)
    }
}

fn positive(value: f64, label: &str, maximum: f64) -> Result<(), ProjectError> {
    range(value, label, 0.0001, maximum)
}

fn non_negative(value: f64, label: &str, maximum: f64) -> Result<(), ProjectError> {
    range(value, label, 0.0, maximum)
}

fn ratio(value: f64, label: &str) -> Result<(), ProjectError> {
    range(value, label, 1.0, 100.0)
}

fn range(value: f64, label: &str, minimum: f64, maximum: f64) -> Result<(), ProjectError> {
    if !value.is_finite() || value < minimum || value > maximum {
        return invalid(&format!("{label} must be between {minimum} and {maximum}."));
    }
    Ok(())
}

fn invalid<Value>(message: &str) -> Result<Value, ProjectError> {
    Err(ProjectError::InvalidInput(message.into()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_match_the_original_engine() {
        let variables = EngineVariables::default();
        assert_eq!(variables.base_energy_capacity, 10.0);
        assert_eq!(variables.initial_energy_decay_rate, 0.05);
        assert_eq!(variables.run_skill_level_modifier, 1.055);
        assert_eq!(variables.persistent_skill_level_modifier, 1.012);
        assert!(variables.validated().is_ok());
    }

    #[test]
    fn rejects_unsafe_engine_values() {
        assert!(
            EngineVariables {
                ticks_per_second: 0,
                ..EngineVariables::default()
            }
            .validated()
            .is_err()
        );
        assert!(
            EngineVariables {
                run_skill_experience_growth: 0.9,
                ..EngineVariables::default()
            }
            .validated()
            .is_err()
        );
    }
}
