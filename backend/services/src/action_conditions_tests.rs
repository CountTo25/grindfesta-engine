use super::*;

#[test]
fn condition_shape_uses_string_fields() {
    let condition = ActionCondition {
        condition: LOCATION.into(),
        value: Uuid::nil().to_string(),
        not: false,
        amount: None,
        comparison_value: None,
        check: None,
    };
    assert_eq!(
        serde_json::to_string(&condition).unwrap(),
        r#"{"condition":"location","value":"00000000-0000-0000-0000-000000000000","not":false}"#
    );
}

#[test]
fn legacy_conditions_default_to_not_disabled() {
    let condition: ActionCondition = serde_json::from_str(
        r#"{"condition":"location","value":"00000000-0000-0000-0000-000000000000"}"#,
    )
    .unwrap();
    assert!(!condition.not);
}

#[test]
fn validates_condition_join() {
    assert_eq!(validate_condition_join(" and ").unwrap(), "and");
    assert_eq!(validate_condition_join("or").unwrap(), "or");
    assert!(validate_condition_join("xor").is_err());
}
