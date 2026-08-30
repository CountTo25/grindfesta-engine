<script lang="ts">
  import { createIconLibrary } from "../api/iconLibraries";
  import type { IconLibrary } from "../api/iconLibraries";
  import GlassButton from "./GlassButton.svelte";
  import TextField from "./TextField.svelte";

  export let projectUuid: string;
  export let canCancel = false;
  export let onAdded: (library: IconLibrary) => void;
  export let onCancel: () => void;

  let sourceUrl = "";
  let prefix = "";
  let cssContent = "";
  let fileName = "";
  let submitting = false;
  let errorMessage = "";
  let dragging = false;

  async function selectFile(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".css")) {
      errorMessage = "Choose a CSS file.";
      return;
    }
    cssContent = await file.text();
    fileName = file.name;
    sourceUrl = "";
    errorMessage = "";
  }

  async function submit() {
    submitting = true;
    errorMessage = "";
    try {
      const library = await createIconLibrary(projectUuid, {
        prefix,
        ...(cssContent ? { cssContent, fileName } : { sourceUrl: sourceUrl.trim() }),
      });
      onAdded(library);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Icon library could not be added.";
    } finally {
      submitting = false;
    }
  }

  function drop(event: DragEvent) {
    dragging = false;
    void selectFile(event.dataTransfer?.files[0]);
  }
</script>

<form class="icon-library-form" on:submit|preventDefault={submit}>
  <TextField
    bind:value={sourceUrl}
    label="CSS URL"
    name="iconLibraryUrl"
    type="text"
    disabled={submitting}
    autocomplete="url"
    on:input={() => {
      cssContent = "";
      fileName = "";
    }}
  />
  <TextField
    bind:value={prefix}
    label="Icon prefix"
    name="iconPrefix"
    maxlength={40}
    disabled={submitting}
    autocomplete="off"
  />
  <label
    class:dragging
    class="icon-css-drop"
    on:dragenter|preventDefault={() => (dragging = true)}
    on:dragover|preventDefault
    on:dragleave|preventDefault={() => (dragging = false)}
    on:drop|preventDefault={drop}
  >
    <input
      type="file"
      accept="text/css,.css"
      disabled={submitting}
      on:change={(event) => selectFile(event.currentTarget.files?.[0])}
    />
    <span>{fileName || "Drop CSS here or choose a file"}</span>
  </label>
  {#if errorMessage}
    <p class="icon-picker-error" role="alert">{errorMessage}</p>
  {/if}
  <div class="icon-library-actions">
    {#if canCancel}
      <GlassButton disabled={submitting} on:click={onCancel}>Cancel</GlassButton>
    {/if}
    <GlassButton type="submit" variant="primary" disabled={submitting}>
      Add library
    </GlassButton>
  </div>
</form>
