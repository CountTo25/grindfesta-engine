use std::path::Path;

use tokio::{fs, process::Command};

use crate::ProjectError;
use crate::compiler_assets::Asset;
use crate::compiler_progress::BuildReporter;

pub(crate) async fn write_assets(
    root: &Path,
    prefix: &str,
    assets: &[Asset],
    replacements: &[(String, String)],
) -> Result<(), ProjectError> {
    for (relative, contents) in assets {
        write_text(
            &root.join(prefix).join(relative),
            &replace_all(contents, replacements),
        )
        .await?;
    }
    Ok(())
}

pub(crate) fn replace_all(contents: &str, replacements: &[(String, String)]) -> String {
    replacements
        .iter()
        .fold(contents.to_owned(), |rendered, (placeholder, value)| {
            rendered.replace(placeholder, value)
        })
}

pub(crate) async fn write_text(path: &Path, contents: &str) -> Result<(), ProjectError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).await.map_err(internal)?;
    }
    fs::write(path, contents).await.map_err(internal)
}

pub(crate) async fn run_bun_stage(
    directory: &Path,
    arguments: &[&str],
    reporter: &BuildReporter,
    stage: &str,
    running_message: &str,
    completed_message: &str,
) -> Result<(), ProjectError> {
    reporter.running(stage, running_message);
    let output = Command::new(crate::runtime::resolve_command("bun"))
        .args(arguments)
        .current_dir(directory)
        .output()
        .await
        .map_err(internal)?;
    if output.status.success() {
        reporter.completed(stage, completed_message);
        return Ok(());
    }
    let logs = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr),
    );
    let message = format!(
        "Generated game failed `bun {}`:\n{}",
        arguments.join(" "),
        logs.chars()
            .rev()
            .take(6000)
            .collect::<String>()
            .chars()
            .rev()
            .collect::<String>(),
    );
    reporter.failed(stage, &message);
    Err(ProjectError::Internal(message))
}

fn internal(error: impl ToString) -> ProjectError {
    ProjectError::Internal(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn replaces_all_theme_placeholders() {
        let replacements = vec![("GLASS_ACCENT".into(), "12 34 56".into())];
        assert_eq!(
            replace_all("color: rgb(GLASS_ACCENT);", &replacements),
            "color: rgb(12 34 56);"
        );
    }
}
