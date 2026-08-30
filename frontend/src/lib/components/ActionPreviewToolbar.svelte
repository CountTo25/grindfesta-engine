<script lang="ts">
  import {
    actionSkillModifier,
    type ActionPreviewSkillLevels,
  } from "../actionPreview";
  import type { LocationDefinition } from "../api/locations";
  import type { EngineVariables } from "../api/projects";
  import type { SkillDefinition } from "../api/skills";
  import GlassSelect from "./GlassSelect.svelte";
  import TextField from "./TextField.svelte";

  export let locations: LocationDefinition[] = [];
  export let skills: SkillDefinition[] = [];
  export let selectedLocation = "";
  export let skillLevels: Record<string, ActionPreviewSkillLevels> = {};
  export let searchQuery = "";
  export let engineVariables: EngineVariables;

  $: locationOptions = [
    { value: "", label: "All locations" },
    ...locations.map((location) => ({ value: location.uuid, label: location.title })),
  ];
  $: skillPreviews = skills.map((skill) => {
    const levels = skillLevels[skill.uuid] ?? { run: 1, timeCompression: 1 };
    return { skill, levels, modifier: actionSkillModifier(levels, engineVariables) };
  });

  function levelsFor(skillUuid: string) {
    return skillLevels[skillUuid] ?? { run: 1, timeCompression: 1 };
  }

  function updateSkillLevel(
    skillUuid: string,
    level: keyof ActionPreviewSkillLevels,
    event: Event,
  ) {
    const input = event.currentTarget as HTMLInputElement;
    const parsed = Number.parseInt(input.value, 10);
    if (!Number.isSafeInteger(parsed)) return;
    skillLevels = {
      ...skillLevels,
      [skillUuid]: {
        ...levelsFor(skillUuid),
        [level]: Math.min(999, Math.max(1, parsed)),
      },
    };
  }
</script>

<header class="action-preview-toolbar" aria-label="Action preview controls">
  <div class="action-skill-toolbar" role="group" aria-label="Skill preview levels">
    {#each skillPreviews as preview (preview.skill.uuid)}
      <section class="action-skill-preview" aria-label={`${preview.skill.name} levels`}>
        <header class="action-skill-preview-heading">
          <strong class="field-label">{preview.skill.name}</strong>
          <span class="action-total-modifier">
            <span>Total modifier</span>
            <strong>×{preview.modifier.toFixed(3)}</strong>
          </span>
        </header>
        <div class="action-level-fields">
          <label class="action-level-field">
            <span>Run level</span>
            <input
              class="text-input action-level-input"
              type="number"
              min="1"
              max="999"
              step="1"
              value={preview.levels.run}
              on:input={(event) => updateSkillLevel(preview.skill.uuid, "run", event)}
            />
          </label>
          <label class="action-level-field">
            <span>Persistent level</span>
            <input
              class="text-input action-level-input"
              type="number"
              min="1"
              max="999"
              step="1"
              value={preview.levels.timeCompression}
              on:input={(event) =>
                updateSkillLevel(preview.skill.uuid, "timeCompression", event)}
            />
          </label>
        </div>
      </section>
    {/each}
  </div>
  <div class="action-filter-toolbar" aria-label="Action filters">
    <div class="action-location-filter">
      <GlassSelect
        bind:value={selectedLocation}
        label="Location"
        name="actionLocationFilter"
        options={locationOptions}
      />
    </div>
    <div class="action-title-filter">
      <TextField bind:value={searchQuery} label="Search" name="actionSearch" type="search"
        autocomplete="off" />
    </div>
  </div>
</header>
