<script lang="ts">
  import type { IconLibrary } from "../api/iconLibraries";
  import { iconDisplayName, renderedIconClass } from "../iconLibraries";

  export let library: IconLibrary;
  export let search = "";
  export let onChoose: (iconClass: string) => void;

  $: query = search.trim().toLowerCase();
  $: matchingIcons = library.icons.filter((icon) =>
    iconDisplayName(library, icon).toLowerCase().includes(query),
  );
  $: visibleIcons = matchingIcons.slice(0, 1200);
</script>

<div class="icon-grid" aria-label="Available icons">
  {#each visibleIcons as iconClass (iconClass)}
    <button
      type="button"
      class="icon-grid-option"
      title={iconDisplayName(library, iconClass)}
      aria-label={iconDisplayName(library, iconClass)}
      on:click={() => onChoose(renderedIconClass(library, iconClass))}
    >
      <i class={renderedIconClass(library, iconClass)} aria-hidden="true"></i>
    </button>
  {/each}
</div>
{#if matchingIcons.length > visibleIcons.length}
  <p class="icon-grid-limit">Refine the search to see the remaining icons.</p>
{:else if matchingIcons.length === 0}
  <p class="icon-grid-limit">No matching icons.</p>
{/if}
