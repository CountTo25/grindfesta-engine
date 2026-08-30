use std::fmt::Write;

use serde::Serialize;
use uuid::Uuid;

use crate::action_codegen::action_modules;
use crate::{
    ActionDefinition, FlagDefinition, ItemDefinition, LocationDefinition, Project, ProjectError,
    ProjectMigration, ProjectUi, SkillDefinition,
};

pub(crate) struct GeneratedModule {
    pub path: String,
    pub contents: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GeneratedProjectData<'a> {
    uuid: Uuid,
    schema_version: u32,
    name: &'a str,
    description: &'a str,
    ui: &'a ProjectUi,
}

pub(crate) fn generate_game_modules(
    project: &Project,
    skills: &[SkillDefinition],
    locations: &[LocationDefinition],
    actions: &[ActionDefinition],
    items: &[ItemDefinition],
    flags: &[FlagDefinition],
    migrations: &[ProjectMigration],
) -> Result<Vec<GeneratedModule>, ProjectError> {
    let mut modules = vec![module(
        "project.ts",
        format!(
            "import type {{ ProjectData }} from \"../game/types\";\n\n\
             export const project: ProjectData = {};\n",
            json(&GeneratedProjectData {
                uuid: project.uuid,
                schema_version: project.schema_version,
                name: &project.name,
                description: &project.description,
                ui: &project.ui,
            })?,
        ),
    )];
    modules.push(module(
        "engineVariables.ts",
        format!(
            "import type {{ EngineVariablesData }} from \"../game/types\";\n\n\
             export const engineVariables: EngineVariablesData = {};\n",
            json(&project.engine_variables)?,
        ),
    ));
    modules.extend(entity_modules(
        "skills",
        skills,
        |skill| skill.uuid.to_string(),
        "SkillData",
        "skill",
    )?);
    modules.extend(entity_modules(
        "locations",
        locations,
        |location| location.uuid.to_string(),
        "LocationData",
        "location",
    )?);
    modules.extend(entity_modules(
        "items",
        items,
        |item| item.uuid.to_string(),
        "ItemData",
        "item",
    )?);
    modules.extend(entity_modules(
        "flags",
        flags,
        |flag| flag.uuid.to_string(),
        "FlagData",
        "flag",
    )?);
    modules.extend(entity_modules(
        "migrations",
        migrations,
        |migration| migration.migration_id.to_string(),
        "SaveMigration",
        "migration",
    )?);
    modules.extend(action_modules(actions, items, flags)?);
    modules.push(module("game.ts", game_entry()));
    Ok(modules)
}

fn entity_modules<Value: serde::Serialize>(
    directory: &str,
    values: &[Value],
    id: impl Fn(&Value) -> String,
    type_name: &str,
    export_name: &str,
) -> Result<Vec<GeneratedModule>, ProjectError> {
    let mut modules = Vec::new();
    let mut index = format!("import type {{ {type_name} }} from \"../../game/types\";\n");
    for (position, value) in values.iter().enumerate() {
        let alias = format!("{export_name}{position}");
        let entity_id = id(value);
        writeln!(index, "import {alias} from \"./{entity_id}\";").unwrap();
        modules.push(module(
            format!("{directory}/{entity_id}.ts"),
            format!(
                "import type {{ {type_name} }} from \"../../game/types\";\n\n\
                 const {export_name}: {type_name} = {};\n\n\
                 export default {export_name};\n",
                json(value)?,
            ),
        ));
    }
    writeln!(index, "\nexport const {directory}: {type_name}[] = [").unwrap();
    for position in 0..values.len() {
        writeln!(index, "  {export_name}{position},").unwrap();
    }
    index.push_str("];\n");
    modules.push(module(format!("{directory}/index.ts"), index));
    Ok(modules)
}

fn game_entry() -> String {
    String::from(concat!(
        "import type { GameDefinition } from \"../game/types\";\n",
        "import { actions } from \"./actions\";\n",
        "import { engineVariables } from \"./engineVariables\";\n",
        "import { locations } from \"./locations\";\n",
        "import { items } from \"./items\";\n",
        "import { flags } from \"./flags\";\n",
        "import { migrations } from \"./migrations\";\n",
        "import { project } from \"./project\";\n",
        "import { skills } from \"./skills\";\n\n",
        "export const game: GameDefinition = {\n",
        "  schemaVersion: 1,\n",
        "  project,\n",
        "  engineVariables,\n",
        "  skills,\n",
        "  locations,\n",
        "  items,\n",
        "  flags,\n",
        "  migrations,\n",
        "  actions,\n",
        "};\n",
    ))
}

pub(crate) fn module(path: impl Into<String>, contents: String) -> GeneratedModule {
    GeneratedModule {
        path: path.into(),
        contents,
    }
}

pub(crate) fn json(value: &(impl serde::Serialize + ?Sized)) -> Result<String, ProjectError> {
    serde_json::to_string_pretty(value).map_err(|error| ProjectError::Internal(error.to_string()))
}
