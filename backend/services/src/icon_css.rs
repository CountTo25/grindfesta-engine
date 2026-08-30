use std::collections::BTreeSet;

pub(crate) struct ParsedIconCss {
    pub icons: Vec<String>,
    pub style_class: String,
}

pub(crate) fn parse_icon_css(css: &str, prefix: &str) -> ParsedIconCss {
    let mut icons = BTreeSet::new();

    for rule in css.split('}') {
        let Some((selectors, body)) = rule.rsplit_once('{') else {
            continue;
        };
        let compact_body: String = body
            .chars()
            .filter(|character| !character.is_whitespace())
            .collect();
        if !compact_body.contains("content:") && !compact_body.contains("--fa:") {
            continue;
        }

        for class_name in class_names(selectors) {
            if is_icon_class(&class_name, prefix) {
                icons.insert(class_name);
            }
        }
    }

    ParsedIconCss {
        icons: icons.into_iter().take(20_000).collect(),
        style_class: detect_style_class(css, prefix),
    }
}

fn class_names(selector: &str) -> Vec<String> {
    let bytes = selector.as_bytes();
    let mut classes = Vec::new();
    let mut index = 0;

    while index < bytes.len() {
        if bytes[index] != b'.' {
            index += 1;
            continue;
        }
        let start = index + 1;
        index = start;
        while index < bytes.len()
            && (bytes[index].is_ascii_alphanumeric() || matches!(bytes[index], b'-' | b'_'))
        {
            index += 1;
        }
        if index > start {
            classes.push(selector[start..index].to_owned());
        }
    }

    classes
}

fn is_icon_class(class_name: &str, prefix: &str) -> bool {
    if prefix.is_empty() {
        return !class_name.is_empty();
    }
    let is_prefixed = class_name
        .strip_prefix(prefix)
        .is_some_and(|suffix| suffix.starts_with('-') && suffix.len() > 1);
    is_prefixed && !is_style_class(class_name, prefix)
}

fn is_style_class(class_name: &str, prefix: &str) -> bool {
    [
        "brands", "classic", "duotone", "light", "regular", "sharp", "solid", "thin",
    ]
    .into_iter()
    .any(|style| class_name == format!("{prefix}-{style}"))
}

fn detect_style_class(css: &str, prefix: &str) -> String {
    if prefix.is_empty() {
        return String::new();
    }
    let candidates = [
        format!("{prefix}-solid"),
        format!("{prefix}s"),
        prefix.to_owned(),
    ];
    candidates
        .into_iter()
        .find(|candidate| !candidate.is_empty() && css.contains(&format!(".{candidate}")))
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn discovers_font_awesome_icon_rules() {
        let css = r#"
            .fa-solid, .fas { font-weight: 900; }
            .fa-user::before { content: "\\f007"; }
            .fa-hammer:before, .fa-mallet:before { content: "\\f6e3"; }
        "#;
        let parsed = parse_icon_css(css, "fa");

        assert_eq!(parsed.style_class, "fa-solid");
        assert_eq!(parsed.icons, ["fa-hammer", "fa-mallet", "fa-user"]);
    }

    #[test]
    fn discovers_custom_property_rules() {
        let parsed = parse_icon_css(r#".fa-wand { --fa: "\f72b"; }"#, "fa");
        assert_eq!(parsed.icons, ["fa-wand"]);
    }
}
