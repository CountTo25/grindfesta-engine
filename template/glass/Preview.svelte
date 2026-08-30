<script lang="ts">
  import ActionCard from "./components/ActionCard.svelte";
  import ActionControl from "./components/ActionControl.svelte";
  import ActionMetadata from "./components/ActionMetadata.svelte";
  import GameShell from "./components/GameShell.svelte";
  import GlassButton from "./components/GlassButton.svelte";
  import GlassPanel from "./components/GlassPanel.svelte";
  import GlassRoot from "./components/GlassRoot.svelte";
  import RunStatus from "./components/RunStatus.svelte";
  import SkillCard from "./components/SkillCard.svelte";
  import ScrollArea from "./components/ScrollArea.svelte";

  let running = false;
  let queuedCount = 0;
  let progress = 42;
</script>

<GlassRoot className="preview-root">
  <GameShell>
    <RunStatus
      slot="run"
      elapsed="01:24"
      currentEnergy={8.4}
      maxEnergy={10}
      drainRate={0.06}
      remaining="02:06"
    />

    <svelte:fragment slot="status">
      <SkillCard
        name="Exploration"
        modifier={1.24}
        runLevel={4}
        persistentLevel={2}
        runModifier={1.18}
        persistentModifier={1.05}
        runProgress={58}
        persistentProgress={31}
      />
    </svelte:fragment>

    <div slot="location" class="glass-card preview-location">
      Current location
    </div>

    <GlassPanel title="Actions" meta="2 available" contentClass="action-list">
      <ActionCard
        title="Action title"
        subtitle="Optional flavour or outcome hint"
        duration="2.40s"
        {progress}
        {running}
        {queuedCount}
        on:click={() => (running = !running)}
      >
        <span slot="icon" aria-hidden="true">◆</span>
        <svelte:fragment slot="controls">
          <ActionControl
            mode="text"
            label="Queue"
            title="Queue action"
            badge={queuedCount || null}
            on:click={() => (queuedCount += 1)}
          />
          <ActionControl
            mode="text"
            label={running ? "Pause" : "Play"}
            title={running ? "Pause" : "Start"}
            active={running}
            on:click={() => (running = !running)}
          />
        </svelte:fragment>
        <ActionMetadata
          slot="details"
          title="Action title"
          skill="Exploration"
          runModifier={1.18}
          persistentModifier={1.05}
          totalModifier={1.24}
          baseDuration={3}
          duration={2.4}
          progress={1.26}
          weight={3}
          {queuedCount}
          traits={[{ icon: "↻", label: "Repeats while available" }]}
          actionId="preview-action"
        />
      </ActionCard>

      <ActionCard title="Locked action" duration="—" locked known={false}>
        <span slot="icon" aria-hidden="true">◇</span>
        <span slot="requirements">Requires a reveal condition</span>
      </ActionCard>
    </GlassPanel>

    <GlassPanel slot="queue" title="Queue" meta={`${queuedCount} entries`} />
    <GlassPanel
      slot="inventory"
      title="Inventory"
      meta="3 / 10"
      contentClass="preview-inventory"
    >
      <ScrollArea ariaLabel="Inventory items">
        {#each ["Item one", "Item two", "Item three"] as item, index}
          <div class="glass-card preview-item">
            <span>{item}</span><strong>{index + 1}</strong>
          </div>
        {/each}
      </ScrollArea>
    </GlassPanel>
    <GlassPanel slot="timeline" title="Timeline">
      <div class="glass-card preview-item">
        <span>00:42</span><strong>Milestone</strong>
      </div>
    </GlassPanel>
  </GameShell>
</GlassRoot>

<style>
  :global(html, body, #app) {
    min-height: 100%;
    margin: 0;
  }

  :global(.preview-root) {
    min-height: 100vh;
  }

  :global(.action-list) {
    display: grid;
    gap: 8px;
  }

  .preview-location {
    padding: 7px 12px;
    color: var(--ui-text-muted);
    font-size: 0.7rem;
    text-align: center;
  }

  :global(.preview-inventory) {
    height: 180px;
  }

  .preview-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .preview-item {
    margin-bottom: 6px;
    padding: 8px 10px;
    font-size: 0.7rem;
  }

</style>
