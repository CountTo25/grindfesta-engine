use std::fs::{self, File};
use std::io::{Cursor, Write};
use std::path::Path;

use uuid::Uuid;
use zip::{CompressionMethod, ZipWriter, write::SimpleFileOptions};

use crate::{App, ProjectError};

pub struct ShippableArchive {
    pub filename: String,
    pub bytes: Vec<u8>,
}

impl App {
    pub async fn shippable_archive(
        &self,
        requested_uuid: &str,
    ) -> Result<ShippableArchive, ProjectError> {
        let project_uuid = Uuid::parse_str(requested_uuid).map_err(|_| ProjectError::NotFound)?;
        let project = self
            .projects()
            .list()
            .await?
            .into_iter()
            .find(|project| project.uuid == project_uuid)
            .ok_or(ProjectError::NotFound)?;
        let project_dir = self.projects().project_dir(requested_uuid).await?;
        let dist = project_dir.join("generated/dist");
        if !tokio::fs::try_exists(dist.join("index.html"))
            .await
            .map_err(internal)?
        {
            return Err(ProjectError::InvalidInput(
                "Build the project before downloading it.".into(),
            ));
        }
        let bytes = tokio::task::spawn_blocking(move || archive_directory(&dist))
            .await
            .map_err(internal)??;
        Ok(ShippableArchive {
            filename: archive_filename(&project.name),
            bytes,
        })
    }
}

fn archive_directory(root: &Path) -> Result<Vec<u8>, ProjectError> {
    let cursor = Cursor::new(Vec::new());
    let mut archive = ZipWriter::new(cursor);
    add_files(root, root, &mut archive)?;
    archive
        .finish()
        .map(|cursor| cursor.into_inner())
        .map_err(internal)
}

fn add_files(
    root: &Path,
    directory: &Path,
    archive: &mut ZipWriter<Cursor<Vec<u8>>>,
) -> Result<(), ProjectError> {
    let mut entries = fs::read_dir(directory)
        .map_err(internal)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(internal)?;
    entries.sort_by_key(|entry| entry.file_name());
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .unix_permissions(0o644);
    for entry in entries {
        let file_type = entry.file_type().map_err(internal)?;
        if file_type.is_symlink() {
            continue;
        }
        let path = entry.path();
        if file_type.is_dir() {
            add_files(root, &path, archive)?;
            continue;
        }
        if !file_type.is_file() {
            continue;
        }
        let relative = path.strip_prefix(root).map_err(internal)?;
        let name = relative.to_string_lossy().replace('\\', "/");
        archive.start_file(name, options).map_err(internal)?;
        let mut file = File::open(path).map_err(internal)?;
        std::io::copy(&mut file, archive).map_err(internal)?;
        archive.flush().map_err(internal)?;
    }
    Ok(())
}

fn archive_filename(project_name: &str) -> String {
    let mut slug = String::new();
    for character in project_name.chars() {
        if character.is_ascii_alphanumeric() {
            slug.push(character.to_ascii_lowercase());
        } else if !slug.is_empty() && !slug.ends_with('-') {
            slug.push('-');
        }
    }
    let slug = slug.trim_end_matches('-');
    format!(
        "{}-shippable.zip",
        if slug.is_empty() { "game" } else { slug }
    )
}

fn internal(error: impl ToString) -> ProjectError {
    ProjectError::Internal(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Read;

    #[test]
    fn archives_dist_contents_at_the_root() {
        let root = std::env::temp_dir().join(format!("grindfesta-archive-{}", Uuid::new_v4()));
        fs::create_dir_all(root.join("assets")).unwrap();
        fs::write(root.join("index.html"), "game").unwrap();
        fs::write(root.join("assets/game.js"), "code").unwrap();
        let bytes = archive_directory(&root).unwrap();
        let mut archive = zip::ZipArchive::new(Cursor::new(bytes)).unwrap();
        let mut contents = String::new();
        archive
            .by_name("index.html")
            .unwrap()
            .read_to_string(&mut contents)
            .unwrap();
        assert_eq!(contents, "game");
        assert!(archive.by_name("assets/game.js").is_ok());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn creates_host_safe_archive_names() {
        assert_eq!(
            archive_filename("Grindfesta 2 — test"),
            "grindfesta-2-test-shippable.zip"
        );
    }
}
