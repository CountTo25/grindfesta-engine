use super::*;

#[test]
fn validates_project_metadata() {
    let project = Project::validated("  First game  ", "  First run  ", "glass").unwrap();
    assert_eq!(project.name, "First game");
    assert_eq!(project.description, "First run");
    assert_eq!(project.engine_variables, EngineVariables::default());
    assert!(!project.uuid.is_nil());
    assert!(
        project
            .schema_json()
            .unwrap()
            .contains(&project.uuid.to_string())
    );
}

#[test]
fn legacy_project_manifests_receive_engine_defaults() {
    let manifest = r#"{
        "schemaVersion": 1,
        "name": "Legacy",
        "description": "Existing project",
        "ui": { "componentSet": "glass" }
    }"#;
    let schema = format!(r#"{{"schemaVersion":1,"uuid":"{}"}}"#, Uuid::nil());
    let project = Project::from_json(manifest, &schema).unwrap();
    assert_eq!(project.engine_variables, EngineVariables::default());
}

#[test]
fn rejects_invalid_project_metadata() {
    for name in ["", "..", "bad/name", "NUL", "project."] {
        assert!(Project::validated(name, "Description", "glass").is_err());
    }
    assert!(Project::validated("Game", " ", "glass").is_err());
    assert!(Project::validated("Game", "Description", "unknown").is_err());
}
