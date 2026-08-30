<script context="module" lang="ts">
  let nextAutocompleteId = 0;
</script>

<script lang="ts">
  import { createEventDispatcher, tick } from "svelte";
  import type { GlassOption } from "./types";

  export let label: string;
  export let value = "";
  export let options: GlassOption[] = [];
  export let name: string | undefined = undefined;
  export let disabled = false;

  const dispatch = createEventDispatcher<{ change: { value: string } }>();
  const controlId = name ?? `autocomplete-select-${nextAutocompleteId++}`;
  const listboxId = `${controlId}-listbox`;
  let query = "";
  let open = false;
  let openAbove = false;
  let dirty = false;
  let activeIndex = 0;
  let inputElement: HTMLInputElement;

  $: selectedOption = options.find((option) => option.value === value);
  $: selectedLabel = selectedOption?.label ?? "";
  $: selectableOptions = options.filter((option) => !option.disabled);
  $: filteredOptions = dirty
    ? selectableOptions
        .filter((option) => option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
        .sort((left, right) => {
          const search = query.toLocaleLowerCase();
          return Number(!left.label.toLocaleLowerCase().startsWith(search)) -
            Number(!right.label.toLocaleLowerCase().startsWith(search));
        })
    : selectableOptions;
  $: if (!open && query !== selectedLabel) query = selectedLabel;

  async function openMenu() {
    if (disabled || open) return;
    const inputBounds = inputElement.getBoundingClientRect();
    openAbove = inputBounds.top + inputBounds.height / 2 > window.innerHeight / 2;
    open = true;
    dirty = false;
    query = selectedLabel;
    activeIndex = Math.max(0, selectableOptions.findIndex((option) => option.value === value));
    await tick();
    inputElement.select();
  }

  function selectOption(option: GlassOption, close = true) {
    const changed = option.value !== value;
    value = option.value;
    query = option.label;
    dirty = false;
    open = !close;
    if (changed) dispatch("change", { value });
  }

  function handleInput(event: Event) {
    query = (event.currentTarget as HTMLInputElement).value;
    dirty = true;
    open = true;
    activeIndex = 0;
    const exactMatch = selectableOptions.find(
      (option) => option.label.toLocaleLowerCase() === query.trim().toLocaleLowerCase(),
    );
    if (exactMatch && exactMatch.value !== value) {
      value = exactMatch.value;
      dispatch("change", { value });
    }
  }

  function handleBlur() {
    window.setTimeout(() => {
      open = false;
      dirty = false;
      query = selectedLabel;
    });
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      open = false;
      dirty = false;
      query = selectedLabel;
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      open = true;
      if (filteredOptions.length === 0) return;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      activeIndex = (activeIndex + direction + filteredOptions.length) % filteredOptions.length;
      return;
    }
    if (event.key === "Enter" && open && filteredOptions[activeIndex]) {
      event.preventDefault();
      selectOption(filteredOptions[activeIndex]);
      return;
    }
    if (event.key === "Tab" && open && dirty && filteredOptions[activeIndex]) {
      selectOption(filteredOptions[activeIndex]);
    }
  }
</script>

<div class="field-stack autocomplete-select">
  <label class="field-label" for={controlId}>{label}</label>
  <span class="autocomplete-control">
    <input
      bind:this={inputElement}
      id={controlId}
      class="text-input autocomplete-input"
      type="text"
      role="combobox"
      {name}
      {disabled}
      value={query}
      autocomplete="off"
      aria-autocomplete="list"
      aria-expanded={open}
      aria-controls={listboxId}
      aria-activedescendant={open && filteredOptions[activeIndex]
        ? `${controlId}-option-${activeIndex}`
        : undefined}
      on:focus={openMenu}
      on:click={openMenu}
      on:input={handleInput}
      on:keydown={handleKeydown}
      on:blur={handleBlur}
    />
    <span class="autocomplete-chevron" aria-hidden="true">⌄</span>
    {#if open}
      <span
        id={listboxId}
        class="glass-menu autocomplete-menu"
        class:autocomplete-menu-above={openAbove}
        role="listbox"
      >
        {#each filteredOptions as option, index (option.value)}
          <button
            id={`${controlId}-option-${index}`}
            class="autocomplete-option"
            type="button"
            role="option"
            data-active={index === activeIndex || undefined}
            aria-selected={option.value === value}
            on:mouseenter={() => (activeIndex = index)}
            on:mousedown|preventDefault={() => selectOption(option)}
          >
            {option.label}
          </button>
        {:else}
          <span class="autocomplete-empty">No matching targets</span>
        {/each}
      </span>
    {/if}
  </span>
</div>
