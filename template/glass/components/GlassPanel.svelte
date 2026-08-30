<script lang="ts">
  export let title = "";
  export let meta = "";
  export let className = "";
  export let contentClass = "";
  export let accent: string | null = null;
  export let padded = true;
  export let ariaLabel: string | undefined = undefined;
</script>

<section
  class="glass-surface glass-panel {className}"
  style={accent ? `--ui-accent: ${accent}` : undefined}
  aria-label={ariaLabel || title || undefined}
>
  {#if title || $$slots.header}
    <header class="glass-section-header">
      <slot name="header"><span>{title}</span></slot>
      {#if meta}<span class="glass-section-meta">{meta}</span>{/if}
    </header>
  {/if}
  <div class="glass-panel-content {contentClass}" class:padded>
    <slot />
  </div>
  {#if $$slots.footer}
    <footer class="glass-panel-footer glass-divider-top">
      <slot name="footer" />
    </footer>
  {/if}
</section>

<style>
  .glass-panel {
    display: flex;
    min-width: 0;
    min-height: 0;
    flex-direction: column;
    padding: 10px;
  }

  .glass-panel-content {
    min-width: 0;
    min-height: 0;
    flex: 1;
  }

  .glass-panel-content.padded {
    padding: 10px 2px 2px;
  }

  .glass-panel-footer {
    margin-top: 10px;
    padding: 10px 2px 2px;
  }
</style>
