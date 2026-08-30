<script lang="ts">
  import { onMount, tick } from "svelte";
  import { listIconLibraries } from "../api/iconLibraries";
  import { createSkill, listSkills, updateSkill } from "../api/skills";
  import type { SkillDefinition } from "../api/skills";
  import { installIconLibrary } from "../iconLibraries";
  import GlassButton from "./GlassButton.svelte";
  import IconPickerDialog from "./IconPickerDialog.svelte";
  import TextField from "./TextField.svelte";

  export let projectUuid: string;
  export let onSkillCountChanged: (count: number) => void = () => {};

  let skills: SkillDefinition[] = [];
  let skillName = "";
  let errorMessage = "";
  let submitting = false;
  let editingSkillUuid: string | null = null;
  let nameInput: HTMLInputElement | undefined;
  let skillIcon = "";
  let iconPickerOpen = false;

  async function loadSkills() {
    try {
      const [loadedSkills, libraries] = await Promise.all([
        listSkills(projectUuid),
        listIconLibraries(projectUuid),
      ]);
      skills = loadedSkills;
      onSkillCountChanged(skills.length);
      libraries.forEach(installIconLibrary);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Skills could not be loaded.";
    }
  }

  async function saveSkill() {
    const name = skillName.trim();
    if (!name) {
      errorMessage = "Skill name is required.";
      return;
    }

    submitting = true;
    errorMessage = "";
    try {
      if (editingSkillUuid) {
        const skillUuid = editingSkillUuid;
        const updatedSkill = await updateSkill(projectUuid, skillUuid, name, skillIcon);
        skills = skills.map((skill) => (skill.uuid === skillUuid ? updatedSkill : skill));
      } else {
        skills = [...skills, await createSkill(projectUuid, name, skillIcon)];
      }
      onSkillCountChanged(skills.length);
      resetForm();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Skill could not be created.";
    } finally {
      submitting = false;
    }
  }

  async function editSkill(skill: SkillDefinition) {
    editingSkillUuid = skill.uuid;
    skillName = skill.name;
    skillIcon = skill.icon;
    errorMessage = "";
    await tick();
    nameInput?.focus();
    nameInput?.select();
  }

  function resetForm() {
    editingSkillUuid = null;
    skillName = "";
    skillIcon = "";
    errorMessage = "";
  }

  onMount(loadSkills);
</script>

<section class="skill-editor" aria-label="Skills">
  <form class="skill-create-form" on:submit|preventDefault={saveSkill}>
    <TextField
      bind:value={skillName}
      bind:inputElement={nameInput}
      label="Skill name"
      name="skillName"
      maxlength={80}
      required
      autocomplete="off"
    />
    <div class="skill-form-actions">
      <GlassButton disabled={submitting} on:click={() => (iconPickerOpen = true)}>
        <span class="skill-icon-action">
          {#if skillIcon}<i class={skillIcon} aria-hidden="true"></i>{/if}
          <span>Icon</span>
        </span>
      </GlassButton>
      <GlassButton
        type="submit"
        variant={skillName.trim() ? "primary" : "transparent"}
        disabled={submitting}
      >
        Save
      </GlassButton>
    </div>
    {#if editingSkillUuid !== null}
      <GlassButton className="skill-cancel" disabled={submitting} on:click={resetForm}>
        Cancel
      </GlassButton>
    {/if}
  </form>
  {#if errorMessage}
    <p class="skill-error" role="alert">{errorMessage}</p>
  {/if}
  <div class="skill-definition-list">
    {#each skills as skill (skill.uuid)}
      <GlassButton
        className="skill-definition"
        active={editingSkillUuid === skill.uuid}
        pressed={editingSkillUuid === skill.uuid}
        disabled={submitting}
        on:click={() => editSkill(skill)}
      >
        <span class="skill-definition-content">
          {#if skill.icon}<i class={skill.icon} aria-hidden="true"></i>{/if}
          <span>{skill.name}</span>
        </span>
      </GlassButton>
    {/each}
  </div>
</section>

{#if iconPickerOpen}
  <IconPickerDialog
    {projectUuid}
    currentIcon={skillIcon}
    onChoose={(icon) => (skillIcon = icon)}
    onClose={() => (iconPickerOpen = false)}
  />
{/if}
