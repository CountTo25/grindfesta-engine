<script lang="ts">
  import { glassScrollFade } from "../glass/scrollFade";

  export let frameClass = "";
  export let scrollerClass = "";
  export let ariaLabel: string | undefined = undefined;
</script>

<div class={`scroll-fade-frame ${frameClass}`.trim()}>
  <div
    class={`glass-scroll ${scrollerClass}`.trim()}
    use:glassScrollFade
    aria-label={ariaLabel}
  >
    <slot />
  </div>
</div>
