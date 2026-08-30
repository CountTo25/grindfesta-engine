use super::*;

#[test]
fn compiles_joined_and_inverted_conditions() {
    let conditions = vec![ActionCondition {
        condition: "location".into(),
        value: "location-id".into(),
        not: true,
        amount: None,
        comparison_value: None,
        check: None,
    }];
    let generated = generate_conditions("or", &conditions).unwrap();
    assert!(generated.contains("anyConditions"));
    assert!(generated.contains("notCondition"));
    assert!(generated.contains("state.currentLocation"));
}

#[test]
fn compiles_completion_effects() {
    let effects = vec![
        ActionEffect {
            effect: "addLog".into(),
            value: "The gate opens.".into(),
            amount: None,
            flag_value: None,
            operation: None,
            operand: None,
        },
        ActionEffect {
            effect: "changeLocation".into(),
            value: "location-id".into(),
            amount: None,
            flag_value: None,
            operation: None,
            operand: None,
        },
    ];
    let generated = generate_effects(&effects, &[], &[]).unwrap();
    assert!(generated.contains("COMPLETION_EFFECTS.addLog"));
    assert!(generated.contains("The gate opens."));
    assert!(generated.contains("COMPLETION_EFFECTS.changeLocation(\"location-id\")"));
}

#[test]
fn compiles_authored_reveal_rules() {
    let reveal = ActionRevealCondition {
        condition: ActionCondition {
            condition: "hasFlag".into(),
            value: "flag-id".into(),
            not: false,
            amount: None,
            comparison_value: None,
            check: None,
        },
        description: "Find the exit first.".into(),
    };
    let (conditions, explanations) = generate_reveals(&[reveal]).unwrap();
    assert!(conditions.contains("FLAG_RUNTIME.flag"));
    assert!(explanations.contains("Find the exit first."));
}

#[test]
fn compiles_item_conditions_and_effects() {
    let uuid = uuid::Uuid::new_v4();
    let item = ItemDefinition {
        uuid,
        name: "Battery".into(),
        description: "Stored charge".into(),
        capacity: Some(3),
        auto_use: None,
    };
    let condition = ActionCondition {
        condition: "hasItem".into(),
        value: uuid.to_string(),
        not: false,
        amount: Some(2),
        comparison_value: None,
        check: None,
    };
    let effect = ActionEffect {
        effect: "addItem".into(),
        value: uuid.to_string(),
        amount: Some(2),
        flag_value: None,
        operation: None,
        operand: None,
    };
    assert!(generate_condition(&condition).unwrap().contains(">= 2"));
    let generated = generate_effects(&[effect], &[item], &[]).unwrap();
    assert!(generated.contains("addItem"));
    assert!(generated.contains(", 2, 3)"));
}

#[test]
fn compiles_flag_conditions_and_effects() {
    let uuid = uuid::Uuid::new_v4();
    let flag = FlagDefinition {
        uuid,
        name: "Visits".into(),
        value_type: crate::FlagValueType::Number,
    };
    let condition = ActionCondition {
        condition: "flagAtLeast".into(),
        value: uuid.to_string(),
        not: false,
        amount: Some(3),
        comparison_value: None,
        check: None,
    };
    let effect = ActionEffect {
        effect: "increaseFlag".into(),
        value: uuid.to_string(),
        amount: Some(2),
        flag_value: None,
        operation: None,
        operand: None,
    };
    assert!(
        generate_condition(&condition)
            .unwrap()
            .contains("numericFlagAtLeast")
    );
    let generated = generate_effects(&[effect], &[], &[flag]).unwrap();
    assert!(generated.contains("increaseNumericFlag"));
    assert!(generated.contains(", 2)"));
}

#[test]
fn compiles_custom_game_data_checks() {
    let condition = ActionCondition {
        condition: "custom".into(),
        value: "$.energy.currentEnergy".into(),
        not: false,
        amount: None,
        comparison_value: None,
        check: Some(crate::ActionComparison {
            operator: ">=".into(),
            value: serde_json::json!(5),
        }),
    };
    let generated = generate_condition(&condition).unwrap();
    assert!(generated.contains("compareGameData"));
    assert!(generated.contains("\">=\", 5"));
}

#[test]
fn compiles_custom_number_effects() {
    let effect = ActionEffect {
        effect: "custom".into(),
        value: "$.energy.currentEnergy".into(),
        amount: None,
        flag_value: None,
        operation: Some("subtract".into()),
        operand: Some(2.5),
    };
    let generated = generate_effects(&[effect], &[], &[]).unwrap();
    assert!(generated.contains("changeGameDataNumber"));
    assert!(generated.contains("\"subtract\", 2.5"));
}

#[test]
fn compiles_repeatable_actions() {
    let action = ActionDefinition {
        uuid: uuid::Uuid::nil(),
        title: "Mine".into(),
        flavour: "Keep mining.".into(),
        weight: 1.0,
        repeatable: true,
        stop_on_repeat: true,
        required_skill: uuid::Uuid::nil(),
        condition_join: "and".into(),
        conditions: Vec::new(),
        reveal_conditions: Vec::new(),
        completion_effects: vec![ActionEffect {
            effect: "changeLocation".into(),
            value: "location-id".into(),
            amount: None,
            flag_value: None,
            operation: None,
            operand: None,
        }],
    };
    let generated = generate_action(&action, &[], &[]).unwrap();
    assert!(generated.contains("repeatable: true"));
    assert!(generated.contains("stopOnRepeat: true"));
    assert!(generated.contains("movementDestination: \"location-id\""));
}
