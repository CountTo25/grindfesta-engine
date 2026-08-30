use super::*;

#[test]
fn validates_supported_effect_values() {
    assert!(validate_log("A door opens.").is_ok());
    assert!(validate_number("0", false).is_err());
    assert!(validate_amount(Some(0)).is_err());
}
