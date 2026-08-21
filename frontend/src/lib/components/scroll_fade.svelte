<script lang="ts">
  import { glass_scroll_fade } from "../glass/scroll_fade";

  export let frame_class = "";
  export let scroller_class = "";
  export let aria_label: string | undefined = undefined;
</script>

<div class={`scroll_fade_frame ${frame_class}`.trim()}>
  <div
    class={`glass_scroll ${scroller_class}`.trim()}
    use:glass_scroll_fade
    aria-label={aria_label}
  >
    <slot />
  </div>
</div>
