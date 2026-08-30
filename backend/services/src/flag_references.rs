use std::collections::{BTreeMap, HashSet};

use uuid::Uuid;

use crate::actions::StoredAction;
use crate::{ActionCondition, ActionEffect, FlagValueType};

pub(crate) fn repair_flag_references(
    actions: &mut BTreeMap<Uuid, StoredAction>,
    flag_uuid: Uuid,
    value_type: FlagValueType,
) -> usize {
    let id = flag_uuid.to_string();
    let mut repaired = 0;
    for action in actions.values_mut() {
        for condition in action
            .conditions
            .iter_mut()
            .filter(|entry| entry.value == id)
        {
            repaired += repair_condition(condition, value_type);
        }
        deduplicate_conditions(&mut action.conditions);
        for reveal in action
            .reveal_conditions
            .iter_mut()
            .filter(|entry| entry.condition.value == id)
        {
            repaired += repair_condition(&mut reveal.condition, value_type);
        }
        for effect in action
            .completion_effects
            .iter_mut()
            .filter(|entry| entry.value == id)
        {
            repaired += repair_effect(effect, value_type);
        }
    }
    repaired
}

fn repair_condition(condition: &mut ActionCondition, value_type: FlagValueType) -> usize {
    let valid = match condition.condition.as_str() {
        "flagEquals" => value_type == FlagValueType::Text,
        "flagAtLeast" | "flagAtMost" => value_type == FlagValueType::Number,
        _ => true,
    };
    if valid {
        return 0;
    }
    condition.condition = "hasFlag".into();
    condition.amount = None;
    condition.comparison_value = None;
    1
}

fn repair_effect(effect: &mut ActionEffect, value_type: FlagValueType) -> usize {
    let incompatible_numeric = matches!(effect.effect.as_str(), "increaseFlag" | "decreaseFlag")
        && value_type != FlagValueType::Number;
    if incompatible_numeric {
        effect.effect = "setFlag".into();
    }
    if effect.effect != "setFlag" {
        return usize::from(incompatible_numeric);
    }
    let previous_amount = effect.amount;
    let previous_text = effect.flag_value.take();
    match value_type {
        FlagValueType::Boolean => effect.amount = None,
        FlagValueType::Number => {
            effect.amount = Some(
                previous_amount
                    .or_else(|| previous_text.as_deref()?.parse::<u32>().ok())
                    .unwrap_or(1)
                    .min(1_000_000),
            );
        }
        FlagValueType::Text => {
            effect.amount = None;
            effect.flag_value = Some(
                previous_text
                    .or_else(|| previous_amount.map(|value| value.to_string()))
                    .unwrap_or_else(|| "1".into()),
            );
        }
    }
    1
}

fn deduplicate_conditions(conditions: &mut Vec<ActionCondition>) {
    let mut seen = HashSet::new();
    conditions.retain(|condition| {
        seen.insert((
            condition.condition.clone(),
            condition.value.clone(),
            condition.not,
            condition.amount,
            condition.comparison_value.clone(),
        ))
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_invalid_typed_references() {
        let uuid = Uuid::new_v4();
        let mut condition = ActionCondition {
            condition: "flagAtLeast".into(),
            value: uuid.to_string(),
            not: false,
            amount: Some(4),
            comparison_value: None,
            check: None,
        };
        assert_eq!(repair_condition(&mut condition, FlagValueType::Text), 1);
        assert_eq!(condition.condition, "hasFlag");
        let mut effect = ActionEffect {
            effect: "increaseFlag".into(),
            value: uuid.to_string(),
            amount: Some(2),
            flag_value: None,
            operation: None,
            operand: None,
        };
        assert_eq!(repair_effect(&mut effect, FlagValueType::Text), 1);
        assert_eq!(effect.effect, "setFlag");
        assert_eq!(effect.flag_value.as_deref(), Some("2"));
    }
}
