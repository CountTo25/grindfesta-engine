<script lang="ts">
  import { onMount, tick } from "svelte";
  import { createItem, listItems, updateItem, type ItemDefinition } from "../api/items";
  import GlassButton from "./GlassButton.svelte";
  import ItemAutoUseEditor from "./ItemAutoUseEditor.svelte";
  import TextArea from "./TextArea.svelte";
  import TextField from "./TextField.svelte";

  export let projectUuid: string;

  let items: ItemDefinition[] = [];
  let name = "";
  let description = "";
  let capacity = "";
  let autoUseEnabled = false;
  let missingEnergy = "1";
  let restoredEnergy = "1";
  let cooldownSeconds = "5";
  let editingUuid: string | null = null;
  let nameInput: HTMLInputElement | undefined;
  let errorMessage = "";
  let submitting = false;
  let searchQuery = "";

  $: numericCapacity = capacity.trim() ? Number(capacity) : null;
  $: validCapacity = numericCapacity === null || (
    Number.isInteger(numericCapacity) && numericCapacity > 0 && numericCapacity <= 1_000_000
  );
  $: autoUseNumbers = [missingEnergy, restoredEnergy, cooldownSeconds].map(Number);
  $: validAutoUse = !autoUseEnabled || (
    autoUseNumbers[0] > 0 && autoUseNumbers[0] <= 1_000_000 &&
    autoUseNumbers[1] > 0 && autoUseNumbers[1] <= 1_000_000 &&
    autoUseNumbers[2] >= 0 && autoUseNumbers[2] <= 86_400 &&
    autoUseNumbers.every(Number.isFinite)
  );
  $: canSave = Boolean(name.trim()) && Boolean(description.trim()) && validCapacity && validAutoUse;
  $: visibleItems = items.filter((item) =>
    item.name.toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase()));

  onMount(async () => {
    try {
      items = await listItems(projectUuid);
    } catch (error) {
      errorMessage = message(error, "Items could not be loaded.");
    }
  });

  function itemInput() {
    return {
      name: name.trim(),
      description: description.trim(),
      capacity: numericCapacity,
      autoUse: autoUseEnabled ? {
        cooldownMs: Math.round(autoUseNumbers[2] * 1000),
        conditions: [{ condition: "energyMissing" as const, value: autoUseNumbers[0] }],
        effects: [{ effect: "restoreEnergy" as const, value: autoUseNumbers[1] }],
      } : null,
    };
  }

  async function saveItem() {
    if (!canSave) return;
    submitting = true;
    errorMessage = "";
    try {
      if (editingUuid) {
        const uuid = editingUuid;
        const updated = await updateItem(projectUuid, uuid, itemInput());
        items = items.map((item) => item.uuid === uuid ? updated : item);
      } else {
        items = [...items, await createItem(projectUuid, itemInput())];
      }
      resetForm();
    } catch (error) {
      errorMessage = message(error, "Item could not be saved.");
    } finally {
      submitting = false;
    }
  }

  async function editItem(item: ItemDefinition) {
    editingUuid = item.uuid;
    name = item.name;
    description = item.description;
    capacity = item.capacity?.toString() ?? "";
    autoUseEnabled = item.autoUse !== null;
    missingEnergy = item.autoUse?.conditions[0]?.value.toString() ?? "1";
    restoredEnergy = item.autoUse?.effects[0]?.value.toString() ?? "1";
    cooldownSeconds = ((item.autoUse?.cooldownMs ?? 5_000) / 1000).toString();
    errorMessage = "";
    await tick();
    nameInput?.focus();
  }

  function resetForm() {
    editingUuid = null;
    name = "";
    description = "";
    capacity = "";
    autoUseEnabled = false;
    missingEnergy = "1";
    restoredEnergy = "1";
    cooldownSeconds = "5";
    errorMessage = "";
  }

  function message(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
  }
</script>

<section class="item-editor definition-editor" aria-label="Items">
  <form class="item-create-form definition-editor-sidebar" on:submit|preventDefault={saveItem}>
    <TextField bind:value={name} bind:inputElement={nameInput} label="Name" name="itemName"
      maxlength={80} required autocomplete="off" />
    <TextArea bind:value={description} label="Description" name="itemDescription"
      maxlength={500} rows={4} required />
    <TextField bind:value={capacity} label="Capacity (empty is unlimited)" name="itemCapacity"
      type="number" min="1" max="1000000" step="1" autocomplete="off" />
    <ItemAutoUseEditor bind:enabled={autoUseEnabled} bind:missingEnergy
      bind:restoredEnergy bind:cooldownSeconds />
    <GlassButton type="submit" variant={canSave ? "primary" : "transparent"} disabled={submitting}>
      Save
    </GlassButton>
    {#if editingUuid}<GlassButton disabled={submitting} on:click={resetForm}>Cancel</GlassButton>{/if}
    {#if errorMessage}<p class="item-error" role="alert">{errorMessage}</p>{/if}
  </form>
  <section class="definition-catalog" aria-label="Saved items">
    <div class="definition-filter-toolbar">
      <TextField bind:value={searchQuery} label="Search" name="itemSearch" type="search"
        autocomplete="off" />
    </div>
    <div class="definition-card-list">
      {#each visibleItems as item (item.uuid)}
        <article class="definition-card item-definition-card">
          <div class="definition-card-copy">
            <strong>{item.name}</strong>
            <p>{item.description}</p>
            <small>{item.capacity === null ? "Unlimited" : `Capacity ${item.capacity}`}{item.autoUse
              ? ` · Auto-use · ${item.autoUse.effects[0]?.value ?? 0} energy · ${item.autoUse.cooldownMs / 1000}s cooldown`
              : ""}</small>
          </div>
          <GlassButton className="definition-card-edit" active={editingUuid === item.uuid}
            on:click={() => editItem(item)}>Edit</GlassButton>
        </article>
      {/each}
    </div>
  </section>
</section>
