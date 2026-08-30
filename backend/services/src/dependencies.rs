use serde::{Deserialize, Serialize};
use tokio::process::Command;

use crate::App;

#[derive(Debug, Deserialize)]
struct DependencyDefinition {
    name: String,
    command: String,
    #[serde(default)]
    check_arguments: Vec<String>,
    install_url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyStatus {
    pub name: String,
    pub command: String,
    pub installed: bool,
    pub version: Option<String>,
    pub install_url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyReport {
    pub all_installed: bool,
    pub dependencies: Vec<DependencyStatus>,
}

impl App {
    pub async fn check_dependencies(&self) -> Result<DependencyReport, String> {
        let raw = crate::config::get_value(self.get_pool(), "dependencies")
            .await
            .map_err(|error| format!("failed to load dependency config: {error}"))?;
        let definitions: Vec<DependencyDefinition> = serde_json::from_str(&raw)
            .map_err(|error| format!("invalid dependency config: {error}"))?;
        let mut dependencies = Vec::with_capacity(definitions.len());

        for definition in definitions {
            dependencies.push(check_dependency(definition).await);
        }

        Ok(DependencyReport {
            all_installed: dependencies.iter().all(|dependency| dependency.installed),
            dependencies,
        })
    }
}

async fn check_dependency(definition: DependencyDefinition) -> DependencyStatus {
    let output = Command::new(crate::runtime::resolve_command(&definition.command))
        .args(&definition.check_arguments)
        .output()
        .await;
    let (installed, version) = match output {
        Ok(output) if output.status.success() => (true, output_version(&output)),
        _ => (false, None),
    };

    DependencyStatus {
        name: definition.name,
        command: definition.command,
        installed,
        version,
        install_url: definition.install_url,
    }
}

fn output_version(output: &std::process::Output) -> Option<String> {
    let text = if output.stdout.is_empty() {
        String::from_utf8_lossy(&output.stderr)
    } else {
        String::from_utf8_lossy(&output.stdout)
    };

    text.lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .map(|line| line.chars().take(160).collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_seeded_dependency_shape() {
        let raw = r#"[{"name":"Bun","command":"bun","check_arguments":["--version"],"install_url":"https://bun.com/docs/installation"}]"#;
        let dependencies: Vec<DependencyDefinition> = serde_json::from_str(raw).unwrap();

        assert_eq!(dependencies.len(), 1);
        assert_eq!(dependencies[0].command, "bun");
        assert_eq!(dependencies[0].check_arguments, ["--version"]);
    }
}
