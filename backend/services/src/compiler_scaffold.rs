use std::path::Path;

use crate::compiler_assets::{APP_ASSETS, ENGINE_ASSETS, GLASS_ASSETS};
use crate::compiler_io::{replace_all, write_assets, write_text};
use crate::game_codegen::GeneratedModule;
use crate::{IconLibrary, ProjectError};

pub(crate) async fn write_game_scaffold(
    root: &Path,
    modules: &[GeneratedModule],
    libraries: &[IconLibrary],
    replacements: &[(String, String)],
) -> Result<(), ProjectError> {
    write_assets(root, "", APP_ASSETS, replacements).await?;
    write_assets(root, "src/engine", ENGINE_ASSETS, replacements).await?;
    write_assets(root, "src/ui", GLASS_ASSETS, replacements).await?;
    for module in modules {
        write_text(
            &root.join("src/generated").join(&module.path),
            &replace_all(&module.contents, replacements),
        )
        .await?;
    }
    write_icons(root, libraries, replacements).await?;
    write_index(root, libraries, replacements).await
}

async fn write_icons(
    root: &Path,
    libraries: &[IconLibrary],
    replacements: &[(String, String)],
) -> Result<(), ProjectError> {
    let icon_css = libraries
        .iter()
        .filter_map(|library| library.css_content.as_deref())
        .collect::<Vec<_>>()
        .join("\n");
    write_text(
        &root.join("src/generated/icons.css"),
        &replace_all(&icon_css, replacements),
    )
    .await
}

async fn write_index(
    root: &Path,
    libraries: &[IconLibrary],
    replacements: &[(String, String)],
) -> Result<(), ProjectError> {
    let links = libraries
        .iter()
        .filter_map(|library| library.source_url.as_deref())
        .map(icon_link)
        .collect::<Vec<_>>()
        .join("\n    ");
    let index = APP_ASSETS
        .iter()
        .find(|(path, _)| *path == "index.html")
        .map(|(_, contents)| contents.replace("<!-- icon-libraries -->", &links))
        .ok_or_else(|| ProjectError::Internal("Game index asset is missing.".into()))?;
    write_text(&root.join("index.html"), &replace_all(&index, replacements)).await
}

fn icon_link(url: &str) -> String {
    format!(
        "<link rel=\"stylesheet\" href=\"{}\" />",
        escape_attribute(url)
    )
}

fn escape_attribute(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}
