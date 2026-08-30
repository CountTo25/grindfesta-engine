<script lang="ts">
  import { onDestroy } from "svelte";
  import { game } from "./generated/game";
  import ActionControl from "./ui/components/ActionControl.svelte";
  import ActionCard from "./ui/components/ActionCard.svelte";
  import GameShell from "./ui/components/GameShell.svelte";
  import GlassRoot from "./ui/components/GlassRoot.svelte";
  import RunStatus from "./ui/components/RunStatus.svelte";
  import SkillCard from "./ui/components/SkillCard.svelte";
  import EndRun from "./components/EndRun.svelte";
  import GameActionMetadata from "./components/GameActionMetadata.svelte";
  import GameInventory from "./components/GameInventory.svelte";
  import GameQueue from "./components/GameQueue.svelte";
  import GameTimeline from "./components/GameTimeline.svelte";
  import { createGeneratedGame } from "./game/runtime";
  import { resolveStateText } from "./engine/mechanics/reveal";
  import {
    actionDuration,
    actionDurationSeconds,
    actionProgress,
    elapsedTime,
    energyRemainingTime,
    skillView,
  } from "./game/view";

  const data = game;
  const runtime = createGeneratedGame(game);
  const stateStore = runtime.state;

  $: endedRun = $stateStore.endedRun;
  $: displayedLocationUuid = endedRun?.locationUuid ?? $stateStore.currentLocation;
  $: currentLocation = data.locations.find(
    (location) => location.uuid === displayedLocationUuid,
  );
  $: visibleActions = runtime.engine
    .getVisibleActionIds($stateStore)
    .map((actionUuid) => runtime.actions[actionUuid]);
  $: displayedState = endedRun
    ? { ...$stateStore, runExperience: endedRun.runExperience }
    : $stateStore;
  $: skillViews = data.skills
    .filter((skill) =>
      (displayedState.runExperience[skill.uuid] ?? 0) > 0 ||
      (displayedState.persistentExperience[skill.uuid] ?? 0) > 0)
    .map((skill) => ({ skill, ...skillView(data, displayedState, skill.uuid) }));
  $: liveQueue = runtime.getLiveQueue($stateStore);
  $: queuedCounts = liveQueue.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.id] = (counts[entry.id] ?? 0) + 1;
    return counts;
  }, {});
  $: queueSeconds = liveQueue.reduce((total, entry, index) => {
    const action = runtime.actions[entry.id];
    if (!action) return total;
    const duration = actionDurationSeconds(data, $stateStore, action);
    const progress = index === 0
      ? ($stateStore.runtime.actionProgress[entry.id]?.progress ?? 0)
      : 0;
    return total + duration * Math.max(0, 1 - progress / action.weight);
  }, 0);

  const skillFor = (skillUuid: string) =>
    data.skills.find((skill) => skill.uuid === skillUuid);

  onDestroy(runtime.destroy);
</script>

<svelte:head>
  <title>{data.project.name}</title>
  <meta name="description" content={data.project.description} />
</svelte:head>

<GlassRoot className="generated-game-root">
  <GameShell ended={endedRun !== null}>
    <RunStatus
      slot="run"
      elapsed={elapsedTime($stateStore.runtime.elapsedMs)}
      currentEnergy={$stateStore.energy.currentEnergy}
      maxEnergy={$stateStore.energy.maxEnergy}
      drainRate={$stateStore.energy.energyDrainRate}
      remaining={energyRemainingTime(data, $stateStore)}
      endedElapsed={endedRun ? elapsedTime(endedRun.elapsedMs) : null}
      energyMode={data.project.ui.controls.energy.mode}
      energyIcon={data.project.ui.controls.energy.icon}
    />

    <svelte:fragment slot="status">
      {#each skillViews as view (view.skill.uuid)}
        <SkillCard
          name={view.skill.name}
          icon={view.skill.icon}
          modifier={view.modifier}
          runLevel={view.runLevel}
          persistentLevel={view.persistentLevel}
          runModifier={view.runModifier}
          persistentModifier={view.persistentModifier}
          runProgress={view.runProgress}
          persistentProgress={view.persistentProgress}
        />
      {/each}
    </svelte:fragment>

    {#each visibleActions as action (action.uuid)}
      {@const skill = skillFor(action.skill)}
      {@const running = $stateStore.runtime.currentAction?.id === action.uuid}
      {@const availability = runtime.engine.getActionAvailability($stateStore, action.uuid)}
      {@const canStart = availability.available}
      {@const known = $stateStore.historicalActions.includes(action.uuid)}
      {@const requirements = availability.failures
        .map((failure) => resolveStateText(failure.explanation, $stateStore))
        .filter(Boolean).join(" · ")}
      {@const queuedCount = queuedCounts[action.uuid] ?? 0}
      {@const toggleControl = running
        ? data.project.ui.controls.pause
        : data.project.ui.controls.play}
      <ActionCard
        title={action.title}
        subtitle={action.flavour}
        duration={actionDuration(data, $stateStore, action)}
        progress={actionProgress($stateStore, action)}
        repeatable={action.repeatable}
        stopOnRepeat={action.stopOnRepeat}
        {queuedCount}
        {known}
        {running}
        locked={!running && !canStart}
        on:click={() => running
          ? runtime.pauseAction()
          : runtime.playAction(action.uuid)}
      >
        <span slot="icon" aria-hidden="true">
          {#if skill?.icon}<i class={skill.icon}></i>{:else}◆{/if}
        </span>
        <svelte:fragment slot="controls">
          <ActionControl
            mode={data.project.ui.controls.queue.mode}
            icon={data.project.ui.controls.queue.icon}
            label="Queue"
            active={queuedCount > 0}
            disabled={!canStart}
            badge={queuedCount || null}
            on:click={() => runtime.enqueueAction(action.uuid)}
          />
          <ActionControl
            mode={toggleControl.mode}
            icon={toggleControl.icon}
            label={running ? "Pause" : "Play"}
            disabled={!running && !canStart}
            on:click={() => running
              ? runtime.pauseAction()
              : runtime.playAction(action.uuid)}
          />
        </svelte:fragment>
        <GameActionMetadata
          slot="details"
          {data}
          state={$stateStore}
          {action}
          {queuedCount}
          {known}
          revealed={availability.revealed}
          {requirements}
        />
        <span slot="requirements">{requirements || "Requirements not met"}</span>
      </ActionCard>
    {/each}

    <GameQueue
      slot="queue"
      entries={liveQueue}
      actions={runtime.actions}
      estimatedSeconds={queueSeconds}
      remove={runtime.removeQueuedAction}
    />
    <GameInventory
      slot="inventory"
      inventory={$stateStore.runtime.inventory}
      items={data.items}
    />
    <GameTimeline slot="timeline" entries={$stateStore.timeline} />

    <svelte:fragment slot="end">
      {#if endedRun}
      <EndRun
        {data}
        summary={endedRun}
        previous={$stateStore.previousRun}
        location={currentLocation?.title ?? ""}
        startNext={runtime.beginNextRun}
      />
      {/if}
    </svelte:fragment>
  </GameShell>
</GlassRoot>
