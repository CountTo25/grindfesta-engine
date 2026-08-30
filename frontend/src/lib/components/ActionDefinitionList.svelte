<script lang="ts">
  import type { ActionCondition, ActionDefinition } from "../api/actions";
  import type { LocationDefinition } from "../api/locations";
  import type { FlagDefinition } from "../api/flags";
  import type { ItemDefinition } from "../api/items";
  import type { SkillDefinition } from "../api/skills";
  import type { EngineVariables } from "../api/projects";
  import type { JsonPrimitive } from "../gameData";
  import {
    actionMatchesLocation,
    formatActionDuration,
    type ActionPreviewSkillLevels,
  } from "../actionPreview";
  import ActionPreviewToolbar from "./ActionPreviewToolbar.svelte";
  import GlassButton from "./GlassButton.svelte";

  export let actions: ActionDefinition[] = [];
  export let skills: SkillDefinition[] = [];
  export let locations: LocationDefinition[] = [];
  export let items: ItemDefinition[] = [];
  export let flags: FlagDefinition[] = [];
  export let onEdit: (action: ActionDefinition) => void;
  export let engineVariables: EngineVariables;

  let selectedLocation = "";
  let searchQuery = "";
  let skillLevels: Record<string, ActionPreviewSkillLevels> = {};
  let expandedConditionCards: Record<string, boolean> = {};
  const maxVisibleConditions = 3;
  const initialSkillLevels: ActionPreviewSkillLevels = { run: 1, timeCompression: 1 };

  $: normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  $: visibleActions = actions.filter((action) =>
    actionMatchesLocation(action, selectedLocation) &&
    action.title.toLocaleLowerCase().includes(normalizedSearch));

  const conditionLabels = {
    location: "Location",
    actionDoneThisRun: "Done this run",
    actionDoneHistorically: "Done historically",
    hasItem: "Has item",
    hasFlag: "Has flag",
    flagEquals: "Flag equals",
    flagAtLeast: "Flag at least",
    flagAtMost: "Flag at most",
    custom: "Custom field",
  } as const;
  function skillName(skillUuid: string) {
    return skills.find((skill) => skill.uuid === skillUuid)?.name ?? skillUuid;
  }

  function conditionTarget(condition: ActionCondition) {
    if (condition.condition === "custom") return condition.value;
    if (condition.condition === "location") {
      return (
        locations.find((location) => location.uuid === condition.value)?.title ?? condition.value
      );
    }
    if (condition.condition === "hasItem") {
      return items.find((item) => item.uuid === condition.value)?.name ?? condition.value;
    }
    if (condition.condition.startsWith("flag") || condition.condition === "hasFlag") {
      return flags.find((flag) => flag.uuid === condition.value)?.name ?? condition.value;
    }
    return actions.find((action) => action.uuid === condition.value)?.title ?? condition.value;
  }

  function conditionText(condition: ActionCondition) {
    const target = conditionTarget(condition);
    if (condition.condition === "custom") {
      return `${target} ${condition.check?.operator ?? "="} ${formatCheckValue(
        condition.check?.value,
      )}`;
    }
    if (condition.condition === "hasItem") {
      return `${conditionLabels[condition.condition]}: ${condition.amount ?? 1} × ${target}`;
    }
    if (condition.condition === "flagEquals") {
      return `Flag: ${target} = ${condition.comparisonValue ?? ""}`;
    }
    if (condition.condition === "flagAtLeast") {
      return `Flag: ${target} >= ${condition.amount ?? 0}`;
    }
    if (condition.condition === "flagAtMost") {
      return `Flag: ${target} <= ${condition.amount ?? 0}`;
    }
    return `${conditionLabels[condition.condition]}: ${target}`;
  }

  function formatCheckValue(value: JsonPrimitive | undefined) {
    return typeof value === "string" ? JSON.stringify(value) : String(value);
  }

  function toggleConditions(actionUuid: string) {
    expandedConditionCards = {
      ...expandedConditionCards,
      [actionUuid]: !expandedConditionCards[actionUuid],
    };
  }

</script>

<section class="action-catalog" aria-label="Saved actions">
  <ActionPreviewToolbar
    {locations}
    {skills}
    bind:selectedLocation
    bind:skillLevels
    bind:searchQuery
    {engineVariables}
  />
  <div class="action-definition-list">
    {#each visibleActions as action (action.uuid)}
      <article class="action-definition">
        <div class="action-copy">
          <strong>{action.title}</strong>
          <p>{action.flavour}</p>
          {#if action.revealConditions.length > 0}
            <span class="action-reveal-summary">
              Reveal: {action.revealConditions.length}
            </span>
          {/if}
        </div>
        <dl class="action-facts">
          <div>
            <dt>Skill</dt>
            <dd>{skillName(action.requiredSkill)}</dd>
          </div>
          <div>
            <dt>Weight</dt>
            <dd>{action.weight}</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>{action.stopOnRepeat ? "Reusable" : action.repeatable ? "Repeatable" : "Once"}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>
              {formatActionDuration(
                action.weight,
                skillLevels[action.requiredSkill] ?? initialSkillLevels,
                engineVariables,
              )}
            </dd>
          </div>
          <div>
            <dt>Effects</dt>
            <dd>{action.completionEffects.length}</dd>
          </div>
        </dl>
        <div class="action-condition-summary">
          {#if action.conditions.length > 0}
            <span class="field-label">Conditions</span>
            <div class="action-condition-expression">
              {#each (expandedConditionCards[action.uuid]
                ? action.conditions
                : action.conditions.slice(0, maxVisibleConditions)) as condition, index}
                {#if index > 0}
                  <span class="action-condition-join">{action.conditionJoin.toUpperCase()}</span>
                {/if}
                <span class="action-condition-clause" data-inverted={condition.not || undefined}>
                  {condition.not ? "NOT " : ""}{conditionText(condition)}
                </span>
              {/each}
              {#if action.conditions.length > maxVisibleConditions}
                <GlassButton
                  className="action-condition-expand"
                  ariaLabel={expandedConditionCards[action.uuid]
                    ? `Show fewer conditions for ${action.title}`
                    : `Expand all ${action.conditions.length} conditions for ${action.title}`}
                  on:click={() => toggleConditions(action.uuid)}
                >
                  {expandedConditionCards[action.uuid] ? "Show less" : "Expand all"}
                </GlassButton>
              {/if}
            </div>
          {/if}
        </div>
        <GlassButton className="action-definition-edit" on:click={() => onEdit(action)}>
          Edit
        </GlassButton>
      </article>
    {/each}
  </div>
</section>
