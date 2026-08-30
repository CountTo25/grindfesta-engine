use crate::action_fields::{validate_repetition, validate_text, validate_weight};
use crate::actions::StoredAction;

#[test]
fn validates_action_fields() {
    assert_eq!(
        validate_text("  Chop wood  ", "Action title", 80).unwrap(),
        "Chop wood"
    );
    assert!(validate_text(" ", "Action title", 80).is_err());
    assert_eq!(validate_weight(1.5).unwrap(), 1.5);
    assert!(validate_weight(0.0).is_err());
    assert!(validate_weight(f64::NAN).is_err());
}

#[test]
fn legacy_actions_default_to_empty_conditions_and_effects() {
    let action: StoredAction = serde_json::from_str(
        r#"{
            "title": "Gather wood",
            "flavour": "Collect fallen branches.",
            "weight": 1,
            "requiredSkill": "00000000-0000-0000-0000-000000000000"
        }"#,
    )
    .unwrap();
    assert!(action.conditions.is_empty());
    assert!(action.reveal_conditions.is_empty());
    assert!(action.completion_effects.is_empty());
    assert_eq!(action.condition_join, "and");
    assert!(!action.repeatable);
    assert!(!action.stop_on_repeat);
}

#[test]
fn completion_stopping_actions_must_be_repeatable() {
    assert!(validate_repetition(true, true).is_ok());
    assert!(validate_repetition(false, true).is_err());
}
