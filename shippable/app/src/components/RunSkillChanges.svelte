<script lang="ts">
  import type { RunSkillChange } from "../game/runSkillChanges";

  export let changes: RunSkillChange[] = [];

  const modifier = (value: number) => `×${value.toFixed(3)}`;
</script>

{#if changes.length === 0}
  <p class="end-run-empty">No skill stats changed this run.</p>
{:else}
  <div class="run-skill-changes">
    {#each changes as change (change.uuid)}
      <article class="run-skill-change">
        <header>
          <span class="run-skill-identity">
            {#if change.icon}<i class={change.icon} aria-hidden="true"></i>{/if}
            <strong>{change.name}</strong>
          </span>
          <span class="run-skill-xp">+{change.gainedExperience.toFixed(2)} XP</span>
        </header>
        <dl>
          <div>
            <dt>Run level</dt>
            <dd>{change.runLevel[0]} <span>→</span> {change.runLevel[1]}</dd>
          </div>
          <div>
            <dt>Persistent level</dt>
            <dd>{change.persistentLevel[0]} <span>→</span> {change.persistentLevel[1]}</dd>
          </div>
          <div>
            <dt>Total modifier</dt>
            <dd>{modifier(change.modifier[0])} <span>→</span> {modifier(change.modifier[1])}</dd>
          </div>
        </dl>
      </article>
    {/each}
  </div>
{/if}
