<script lang="ts">
  import { onMount } from "svelte";
  import { listIconLibraries } from "../api/iconLibraries";
  import type { IconLibrary } from "../api/iconLibraries";
  import { installIconLibrary } from "../iconLibraries";
  import GlassButton from "./GlassButton.svelte";
  import GlassSelect from "./GlassSelect.svelte";
  import GlassSurface from "./GlassSurface.svelte";
  import IconGrid from "./IconGrid.svelte";
  import IconLibraryForm from "./IconLibraryForm.svelte";
  import TextField from "./TextField.svelte";

  export let projectUuid: string;
  export let currentIcon = "";
  export let title = "Choose icon";
  export let onChoose: (icon: string) => void;
  export let onClose: () => void;

  let libraries: IconLibrary[] = [];
  let selectedLibraryId = "";
  let manualClass = currentIcon;
  let search = "";
  let setupOpen = false;
  let loaded = false;
  let errorMessage = "";

  $: selectedLibrary =
    libraries.find((library) => String(library.id) === selectedLibraryId) ?? libraries[0];
  $: libraryOptions = libraries.map((library) => ({
    value: String(library.id),
    label: `${library.name} (${library.icons.length})`,
  }));

  onMount(async () => {
    try {
      libraries = await listIconLibraries(projectUuid);
      libraries.forEach(installIconLibrary);
      selectedLibraryId = libraries[0] ? String(libraries[0].id) : "";
      setupOpen = libraries.length === 0;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Icon libraries could not be loaded.";
    } finally {
      loaded = true;
    }
  });

  function libraryAdded(library: IconLibrary) {
    installIconLibrary(library);
    libraries = [...libraries, library];
    selectedLibraryId = String(library.id);
    setupOpen = false;
  }

  function choose(icon: string) {
    onChoose(icon.trim());
    onClose();
  }
</script>

<div class="icon-picker-backdrop" role="presentation" on:click|self={onClose}>
  <GlassSurface
    tag="section"
    className="icon-picker-dialog"
    role="dialog"
    ariaLabel={title}
    occludes
  >
    <header class="icon-picker-header">
      <h2>{title}</h2>
      <GlassButton ariaLabel="Close icon picker" on:click={onClose}>Close</GlassButton>
    </header>
    {#if errorMessage}
      <p class="icon-picker-error" role="alert">{errorMessage}</p>
    {:else if loaded && setupOpen}
      <div class="icon-library-setup">
        <IconLibraryForm
          {projectUuid}
          canCancel={libraries.length > 0}
          onAdded={libraryAdded}
          onCancel={() => (setupOpen = false)}
        />
      </div>
    {:else if loaded && selectedLibrary}
      <div class="icon-picker-content">
        <aside class="icon-picker-controls">
          <GlassSelect
            bind:value={selectedLibraryId}
            label="Icon library"
            options={libraryOptions}
          />
          <TextField
            bind:value={manualClass}
            label="Icon classes"
            name="iconClasses"
            maxlength={240}
            autocomplete="off"
          />
          <div class="icon-picker-actions">
            <GlassButton on:click={() => (setupOpen = true)}>Add library</GlassButton>
            <GlassButton on:click={() => choose("")}>Clear icon</GlassButton>
            <GlassButton
              variant="primary"
              disabled={!manualClass.trim()}
              on:click={() => choose(manualClass)}
            >
              Use classes
            </GlassButton>
          </div>
        </aside>
        <div class="icon-picker-browser">
          <TextField bind:value={search} label="Search icons" type="search" autocomplete="off" />
          <IconGrid library={selectedLibrary} {search} onChoose={choose} />
        </div>
      </div>
    {/if}
  </GlassSurface>
</div>
