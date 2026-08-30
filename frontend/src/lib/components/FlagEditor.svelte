<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    createFlag, listFlags, updateFlag, type FlagDefinition, type FlagValueType,
  } from "../api/flags";
  import GlassButton from "./GlassButton.svelte";
  import SegmentedControl from "./SegmentedControl.svelte";
  import TextField from "./TextField.svelte";

  export let projectUuid: string;

  let flags: FlagDefinition[] = [];
  let name = "";
  let valueType: FlagValueType = "boolean";
  let editingUuid: string | null = null;
  let nameInput: HTMLInputElement | undefined;
  let errorMessage = "";
  let submitting = false;
  let searchQuery = "";
  $: canSave = Boolean(name.trim());
  $: visibleFlags = flags.filter((flag) =>
    flag.name.toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase()));

  onMount(async () => {
    try {
      flags = await listFlags(projectUuid);
    } catch (error) {
      errorMessage = message(error, "Flags could not be loaded.");
    }
  });

  async function saveFlag() {
    if (!canSave) return;
    submitting = true;
    errorMessage = "";
    const input = { name: name.trim(), valueType };
    try {
      if (editingUuid) {
        const uuid = editingUuid;
        const updated = await updateFlag(projectUuid, uuid, input);
        flags = flags.map((flag) => flag.uuid === uuid ? updated : flag);
      } else {
        flags = [...flags, await createFlag(projectUuid, input)];
      }
      resetForm();
    } catch (error) {
      errorMessage = message(error, "Flag could not be saved.");
    } finally {
      submitting = false;
    }
  }

  async function editFlag(flag: FlagDefinition) {
    editingUuid = flag.uuid;
    name = flag.name;
    valueType = flag.valueType;
    errorMessage = "";
    await tick();
    nameInput?.focus();
  }

  function resetForm() {
    editingUuid = null;
    name = "";
    valueType = "boolean";
    errorMessage = "";
  }

  function message(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
  }
</script>

<section class="flag-editor definition-editor" aria-label="Flags">
  <form class="flag-create-form definition-editor-sidebar" on:submit|preventDefault={saveFlag}>
    <TextField bind:value={name} bind:inputElement={nameInput} label="Name" name="flagName"
      maxlength={80} required autocomplete="off" />
    <div class="field-stack">
      <span class="field-label">Value type</span>
      <SegmentedControl value={valueType} options={[
        { value: "boolean", label: "Boolean" },
        { value: "number", label: "Number" },
        { value: "text", label: "Text" },
      ]} ariaLabel="Flag value type" onChange={(value) => (valueType = value as FlagValueType)} />
    </div>
    <GlassButton type="submit" variant={canSave ? "primary" : "transparent"} disabled={submitting}>
      Save
    </GlassButton>
    {#if editingUuid}<GlassButton disabled={submitting} on:click={resetForm}>Cancel</GlassButton>{/if}
    {#if errorMessage}<p class="flag-error" role="alert">{errorMessage}</p>{/if}
  </form>
  <section class="definition-catalog" aria-label="Saved flags">
    <div class="definition-filter-toolbar">
      <TextField bind:value={searchQuery} label="Search" name="flagSearch" type="search"
        autocomplete="off" />
    </div>
    <div class="definition-card-list">
      {#each visibleFlags as flag (flag.uuid)}
        <article class="definition-card flag-definition-card">
          <div class="definition-card-copy">
            <strong>{flag.name}</strong>
            <small>{flag.valueType}</small>
          </div>
          <GlassButton className="definition-card-edit" active={editingUuid === flag.uuid}
            on:click={() => editFlag(flag)}>Edit</GlassButton>
        </article>
      {/each}
    </div>
  </section>
</section>
