<script lang="ts">
  import type { UiThemeVariables as UiThemeValues } from "../api/projects";
  import type { UiThemeVariableDefinition } from "../projectTemplates";

  export let definitions: Record<string, UiThemeVariableDefinition>;
  export let values: UiThemeValues;
  export let onChange: (values: UiThemeValues) => void;

  function update(key: string, event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    onChange({ ...values, [key]: input.value });
  }
</script>

{#if Object.keys(definitions).length}
  <section class="ui-theme-variables" aria-labelledby="ui-theme-variables-title">
    <div class="ui-settings-section-heading">
      <p>Theme variables</p>
      <h2 id="ui-theme-variables-title">Appearance</h2>
    </div>
    <div class="ui-theme-variable-list">
      {#each Object.entries(definitions) as [key, definition] (key)}
        <label class="ui-theme-variable-row">
          <span class="ui-theme-variable-copy">
            <strong>{definition.name}</strong>
            <small>{definition.flavour}</small>
          </span>
          <input
            class="text-input"
            value={values[key] ?? definition.value}
            aria-label={definition.name}
            pattern={definition.value.startsWith("#") ? "#[0-9A-Fa-f]{6}" : undefined}
            spellcheck="false"
            on:input={(event) => update(key, event)}
          />
        </label>
      {/each}
    </div>
  </section>
{/if}
