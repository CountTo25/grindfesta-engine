<script context="module" lang="ts">
  let actionDetailsSuppressed = false;
  let suppressedPointerX = 0;
  let suppressedPointerY = 0;
</script>

<script lang="ts">
  import { onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import GlassProgress from "./GlassProgress.svelte";

  const DETAILS_DELAY_MS = 450;
  const POINTER_RELEASE_DISTANCE = 8;

  export let title: string;
  export let subtitle = "";
  export let duration = "";
  export let progress = 0;
  export let locked = false;
  export let known = true;
  export let running = false;
  export let repeatable = false;
  export let stopOnRepeat = false;
  export let queuedCount = 0;
  export let accent: string | null = null;
  export let className = "";
  export let ariaLabel: string | undefined = undefined;

  let cardElement: HTMLDivElement;
  let detailsVisible = false;
  let detailsTimer: number | null = null;
  let detailsLeft = 0;
  let detailsTop = 0;
  let detailsWidth = 0;
  let detailsAbove = false;

  function clearDetailsTimer() {
    if (detailsTimer === null) return;
    window.clearTimeout(detailsTimer);
    detailsTimer = null;
  }

  function activateDetails() {
    if (actionDetailsSuppressed) return;
    const bounds = cardElement.getBoundingClientRect();
    detailsLeft = bounds.left;
    detailsTop = bounds.bottom + 4;
    detailsWidth = bounds.width;
    detailsAbove = window.innerHeight - bounds.bottom < 240 && bounds.top > 240;
    if (detailsAbove) detailsTop = bounds.top - 4;
    detailsVisible = true;
  }

  function scheduleDetails() {
    if (detailsVisible || detailsTimer !== null) return;
    if (actionDetailsSuppressed) return;
    detailsTimer = window.setTimeout(() => {
      detailsTimer = null;
      activateDetails();
    }, DETAILS_DELAY_MS);
  }

  function hideDetails() {
    clearDetailsTimer();
    detailsVisible = false;
  }

  function dismissDetails(event: PointerEvent | MouseEvent) {
    actionDetailsSuppressed = true;
    suppressedPointerX = event.clientX;
    suppressedPointerY = event.clientY;
    hideDetails();
  }

  function handlePointerMove(event: PointerEvent) {
    if (!actionDetailsSuppressed) return;
    const moved = Math.hypot(
      event.clientX - suppressedPointerX,
      event.clientY - suppressedPointerY,
    );
    if (moved < POINTER_RELEASE_DISTANCE) return;
    actionDetailsSuppressed = false;
    scheduleDetails();
  }

  function resumeKeyboardDetails() {
    actionDetailsSuppressed = false;
  }

  function showFocusedDetails() {
    clearDetailsTimer();
    activateDetails();
  }

  function handleFocusOut(event: FocusEvent) {
    if (event.relatedTarget instanceof Node && cardElement.contains(event.relatedTarget)) return;
    hideDetails();
  }

  function portal(node: HTMLElement) {
    const host = cardElement.closest(".glass-root") ?? document.body;
    host.appendChild(node);
    return { destroy: () => node.remove() };
  }

  onDestroy(clearDetailsTimer);
</script>

<div
  bind:this={cardElement}
  class="action-card-shell {className}"
  style={accent ? `--ui-accent: ${accent}` : undefined}
  on:mouseenter={scheduleDetails}
  on:pointermove={handlePointerMove}
  on:mouseleave={hideDetails}
  on:keydown|capture={resumeKeyboardDetails}
  on:focusin={showFocusedDetails}
  on:focusout={handleFocusOut}
  on:pointerdown|capture={dismissDetails}
  on:click|capture={dismissDetails}
>
  <article
    class="glass-card interactive-glass action-card"
    data-locked={locked || undefined}
    aria-label={ariaLabel || (locked && !known ? "Unknown action" : title)}
  >
    {#if running}<div class="action-card-pulse" aria-hidden="true"></div>{/if}
    <div class="action-card-header">
      <span class="action-card-icon"><slot name="icon" /></span>
      <button
        type="button"
        class="action-card-main"
        disabled={locked}
        on:click
      >
        <span class="action-card-title">{locked && !known ? "???" : title}</span>
        {#if repeatable}
          <span class="glass-subtle" title={stopOnRepeat ? "Reusable" : "Repeatable"}
            aria-label={stopOnRepeat ? "Reusable" : "Repeatable"}>↻</span>
        {/if}
        {#if queuedCount > 0}
          <span class="action-card-queue-count">{queuedCount}</span>
        {/if}
      </button>
      <div class="action-card-controls"><slot name="controls" /></div>
      {#if duration}<span class="action-card-duration">{duration}</span>{/if}
    </div>
    {#if locked}
      <div class="action-card-requirement">
        <slot name="requirements">Requirements not met</slot>
      </div>
    {:else if subtitle}
      <div class="action-card-subtitle">{subtitle}</div>
    {/if}
    <div class="action-card-progress-clip">
      <GlassProgress percent={locked ? 0 : progress} label={`${title} progress`} />
    </div>
  </article>
</div>

{#if detailsVisible && $$slots.details}
  <aside
    use:portal
    class="glass-menu action-card-details"
    class:action-card-details-above={detailsAbove}
    style={`left:${detailsLeft}px;top:${detailsTop}px;width:${detailsWidth}px`}
    role="tooltip"
    in:fade={{ duration: 100 }}
  >
    <slot name="details" />
  </aside>
{/if}
