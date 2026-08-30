<script lang="ts">
  import { scrollFade } from "../runtime/scrollFade";

  export let className = "";
  export let contentClass = "";
  export let ariaLabel: string | undefined = undefined;
</script>

<div class="glass-scroll-frame {className}">
  <!-- The overflow region is focusable so keyboard users can scroll it. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    use:scrollFade
    class="glass-scroll {contentClass}"
    aria-label={ariaLabel}
    role="region"
    tabindex="0"
  >
    <slot />
  </div>
</div>
