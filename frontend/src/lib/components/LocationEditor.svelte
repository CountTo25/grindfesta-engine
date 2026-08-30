<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    createLocation, listLocations, updateLocation, type LocationDefinition,
  } from "../api/locations";
  import GlassButton from "./GlassButton.svelte";
  import TextArea from "./TextArea.svelte";
  import TextField from "./TextField.svelte";

  export let projectUuid: string;

  let locations: LocationDefinition[] = [];
  let title = "";
  let flavour = "";
  let editingUuid: string | null = null;
  let titleInput: HTMLInputElement | undefined;
  let errorMessage = "";
  let submitting = false;
  let searchQuery = "";
  $: canSave = Boolean(title.trim()) && Boolean(flavour.trim());
  $: visibleLocations = locations.filter((location) =>
    location.title.toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase()));

  onMount(async () => {
    try {
      locations = await listLocations(projectUuid);
    } catch (error) {
      errorMessage = message(error, "Locations could not be loaded.");
    }
  });

  async function saveLocation() {
    if (!canSave) return;
    submitting = true;
    errorMessage = "";
    const input = { title: title.trim(), flavour: flavour.trim() };
    try {
      if (editingUuid) {
        const uuid = editingUuid;
        const updated = await updateLocation(projectUuid, uuid, input);
        locations = locations.map((location) => location.uuid === uuid ? updated : location);
      } else {
        locations = [...locations, await createLocation(projectUuid, input)];
      }
      resetForm();
    } catch (error) {
      errorMessage = message(error, "Location could not be saved.");
    } finally {
      submitting = false;
    }
  }

  async function editLocation(location: LocationDefinition) {
    editingUuid = location.uuid;
    title = location.title;
    flavour = location.flavour;
    errorMessage = "";
    await tick();
    titleInput?.focus();
  }

  function resetForm() {
    editingUuid = null;
    title = "";
    flavour = "";
    errorMessage = "";
  }

  function message(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
  }
</script>

<section class="location-editor definition-editor" aria-label="Locations">
  <form class="location-create-form definition-editor-sidebar" on:submit|preventDefault={saveLocation}>
    <TextField bind:value={title} bind:inputElement={titleInput} label="Title"
      name="locationTitle" maxlength={80} required autocomplete="off" />
    <TextArea bind:value={flavour} label="Flavour" name="locationFlavour"
      maxlength={500} rows={5} required />
    <GlassButton type="submit" variant={canSave ? "primary" : "transparent"} disabled={submitting}>
      Save
    </GlassButton>
    {#if editingUuid}
      <GlassButton disabled={submitting} on:click={resetForm}>Cancel</GlassButton>
    {/if}
    {#if errorMessage}<p class="location-error" role="alert">{errorMessage}</p>{/if}
  </form>
  <section class="definition-catalog" aria-label="Saved locations">
    <div class="definition-filter-toolbar">
      <TextField bind:value={searchQuery} label="Search" name="locationSearch" type="search"
        autocomplete="off" />
    </div>
    <div class="definition-card-list">
      {#each visibleLocations as location (location.uuid)}
        <article class="definition-card">
          <div class="definition-card-copy">
            <strong>{location.title}</strong>
            <p>{location.flavour}</p>
          </div>
          <GlassButton className="definition-card-edit" active={editingUuid === location.uuid}
            on:click={() => editLocation(location)}>Edit</GlassButton>
        </article>
      {/each}
    </div>
  </section>
</section>
