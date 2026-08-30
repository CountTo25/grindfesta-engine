use std::time::Duration;

use serde::Serialize;
use sqlx::FromRow;

use crate::{App, ProjectError, icon_css::parse_icon_css};

const LIST_ICON_LIBRARIES: &str = include_str!("../../sql/list_icon_libraries.sql");
const INSERT_ICON_LIBRARY: &str = include_str!("../../sql/insert_icon_library.sql");
const MAX_CSS_BYTES: usize = 5 * 1024 * 1024;

#[derive(Debug, FromRow)]
struct IconLibraryRow {
    id: i64,
    project_uuid: String,
    name: String,
    source_url: Option<String>,
    css_content: Option<String>,
    prefix: String,
    style_class: String,
    icons: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IconLibrary {
    pub id: i64,
    pub project_uuid: String,
    pub name: String,
    pub source_url: Option<String>,
    pub css_content: Option<String>,
    pub prefix: String,
    pub style_class: String,
    pub icons: Vec<String>,
}

impl App {
    pub async fn list_icon_libraries(
        &self,
        project_uuid: &str,
    ) -> Result<Vec<IconLibrary>, ProjectError> {
        self.projects().project_dir(project_uuid).await?;
        let rows = sqlx::query_as::<_, IconLibraryRow>(LIST_ICON_LIBRARIES)
            .bind(project_uuid)
            .fetch_all(self.get_pool())
            .await
            .map_err(internal)?;
        rows.into_iter().map(icon_library_from_row).collect()
    }

    pub async fn create_icon_library(
        &self,
        project_uuid: &str,
        source_url: Option<&str>,
        css_content: Option<&str>,
        file_name: Option<&str>,
        requested_prefix: &str,
    ) -> Result<IconLibrary, ProjectError> {
        self.projects().project_dir(project_uuid).await?;
        let prefix = validate_prefix(requested_prefix)?;
        let (url, css, name) = load_source(source_url, css_content, file_name).await?;
        let parsed = parse_icon_css(&css, &prefix);
        if parsed.icons.is_empty() {
            return invalid("No icon classes were found in this stylesheet.");
        }
        let icons = serde_json::to_string(&parsed.icons).map_err(internal)?;
        let stored_css = url.is_none().then_some(css);
        let row = sqlx::query_as::<_, IconLibraryRow>(INSERT_ICON_LIBRARY)
            .bind(project_uuid)
            .bind(name)
            .bind(url)
            .bind(stored_css)
            .bind(prefix)
            .bind(parsed.style_class)
            .bind(icons)
            .fetch_one(self.get_pool())
            .await
            .map_err(internal)?;
        icon_library_from_row(row)
    }
}

async fn load_source(
    source_url: Option<&str>,
    css_content: Option<&str>,
    file_name: Option<&str>,
) -> Result<(Option<String>, String, String), ProjectError> {
    match (source_url.map(str::trim), css_content) {
        (Some(url), None) if !url.is_empty() => {
            let parsed_url = reqwest::Url::parse(url)
                .map_err(|_| ProjectError::InvalidInput("CSS URL is not valid.".into()))?;
            if !matches!(parsed_url.scheme(), "http" | "https") {
                return invalid("CSS URL must use HTTP or HTTPS.");
            }
            let css = download_css(parsed_url.clone()).await?;
            let name = parsed_url
                .path_segments()
                .and_then(Iterator::last)
                .filter(|name| !name.is_empty())
                .unwrap_or("Icon library")
                .chars()
                .take(120)
                .collect();
            Ok((Some(parsed_url.to_string()), css, name))
        }
        (None, Some(css)) | (Some(""), Some(css)) => {
            if css.len() > MAX_CSS_BYTES {
                return invalid("CSS file must be 5 MB or smaller.");
            }
            let name = file_name.unwrap_or("Uploaded icons.css").trim();
            let name = if name.is_empty() {
                "Uploaded icons.css"
            } else {
                name
            };
            Ok((None, css.to_owned(), name.chars().take(120).collect()))
        }
        _ => invalid("Provide either a CSS URL or one CSS file."),
    }
}

async fn download_css(url: reqwest::Url) -> Result<String, ProjectError> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(12))
        .build()
        .map_err(internal)?;
    let response = client
        .get(url)
        .send()
        .await
        .map_err(internal)?
        .error_for_status()
        .map_err(internal)?;
    if response
        .content_length()
        .is_some_and(|length| length > MAX_CSS_BYTES as u64)
    {
        return invalid("CSS file must be 5 MB or smaller.");
    }
    let bytes = response.bytes().await.map_err(internal)?;
    if bytes.len() > MAX_CSS_BYTES {
        return invalid("CSS file must be 5 MB or smaller.");
    }
    String::from_utf8(bytes.to_vec())
        .map_err(|_| ProjectError::InvalidInput("Stylesheet must be UTF-8 CSS.".into()))
}

fn validate_prefix(requested: &str) -> Result<String, ProjectError> {
    let prefix = requested
        .trim()
        .trim_start_matches('.')
        .trim_end_matches('-');
    if prefix.len() > 40
        || !prefix
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
    {
        return invalid("Prefix may only contain letters, numbers, hyphens, and underscores.");
    }
    Ok(prefix.to_owned())
}

fn icon_library_from_row(row: IconLibraryRow) -> Result<IconLibrary, ProjectError> {
    Ok(IconLibrary {
        id: row.id,
        project_uuid: row.project_uuid,
        name: row.name,
        source_url: row.source_url,
        css_content: row.css_content,
        prefix: row.prefix,
        style_class: row.style_class,
        icons: serde_json::from_str(&row.icons).map_err(internal)?,
    })
}

fn internal(error: impl ToString) -> ProjectError {
    ProjectError::Internal(error.to_string())
}

fn invalid<Value>(message: &str) -> Result<Value, ProjectError> {
    Err(ProjectError::InvalidInput(message.into()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_css_prefix_notation() {
        assert_eq!(validate_prefix("fa").unwrap(), "fa");
        assert_eq!(validate_prefix("fa-").unwrap(), "fa");
        assert_eq!(validate_prefix(".fa-").unwrap(), "fa");
    }
}
