<script lang="ts">
  import type { OverviewRule } from "../overviewTypes";

  export let title: string;
  export let rules: OverviewRule[] = [];
  export let join: "and" | "or" | undefined = undefined;
</script>

{#if rules.length}
  <section class="overview-rule-section">
    <header><span>{title}</span><small>{rules.length}</small></header>
    <div class="overview-rule-list">
      {#each rules as rule, index (`${rule.operation}-${rule.targetId}-${index}`)}
        <div class="overview-rule" class:negated={rule.negated}>
          <span class={`overview-rule-kind ${rule.kind}`}>{rule.kind}</span>
          <span>{rule.negated ? "NOT " : ""}{rule.detail}</span>
          {#if join && index < rules.length - 1}<strong>{join.toLocaleUpperCase()}</strong>{/if}
        </div>
      {/each}
    </div>
  </section>
{/if}
