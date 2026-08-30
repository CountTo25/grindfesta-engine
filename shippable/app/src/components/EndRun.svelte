<script lang="ts">
  import GlassButton from "../ui/components/GlassButton.svelte";
  import GlassPanel from "../ui/components/GlassPanel.svelte";
  import { runSkillChanges } from "../game/runSkillChanges";
  import { compareTimelines } from "../game/runTimelineComparison";
  import { elapsedTime } from "../game/view";
  import type { GameDefinition, RunSummary } from "../game/types";
  import RunSkillChanges from "./RunSkillChanges.svelte";
  import RunTimelineComparison from "./RunTimelineComparison.svelte";

  export let data: GameDefinition;
  export let summary: RunSummary;
  export let previous: RunSummary | null = null;
  export let location = "";
  export let startNext: () => void;

  $: skillChanges = runSkillChanges(data, summary);
  $: timelineComparison = compareTimelines(
    summary.timeline,
    previous?.timeline ?? [],
  );
  $: runMeta = [
    elapsedTime(summary.elapsedMs),
    `${summary.completedActions.length} actions`,
    location,
  ].filter(Boolean).join(" · ");
</script>

<section class="end-run-view">
  <div class="end-run-scroll">
    <GlassPanel className="end-run-overview" padded={false}>
      <div class="end-run-overview-content">
        <div class="end-run-heading">
          <span class="end-run-kicker">Run complete</span>
          <h1>Energy depleted</h1>
          <p>{runMeta}</p>
        </div>
        <GlassButton
          className="end-run-start"
          variant="primary"
          fullWidth
          on:click={startNext}
        >Start new run</GlassButton>
      </div>
    </GlassPanel>

    <div class="end-run-summary-grid">
      <GlassPanel title="Stats changed" meta={`${skillChanges.length} skills`}>
        <RunSkillChanges changes={skillChanges} />
      </GlassPanel>
      <GlassPanel
        title="Timeline comparison"
        meta={previous ? "This run against previous" : "First recorded run"}
      >
        <RunTimelineComparison rows={timelineComparison} />
      </GlassPanel>
    </div>
  </div>
</section>
