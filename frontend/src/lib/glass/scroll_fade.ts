const edge_threshold = 1;

export function glass_scroll_fade(node: HTMLElement) {
  const frame_element = node.parentElement;
  if (!frame_element) return;
  let frame: number | null = null;

  const update = () => {
    frame = null;
    const max_scroll = Math.max(0, node.scrollHeight - node.clientHeight);
    const can_scroll = max_scroll > edge_threshold;
    frame_element.toggleAttribute(
      "data-scroll-before",
      can_scroll && node.scrollTop > edge_threshold,
    );
    frame_element.toggleAttribute(
      "data-scroll-after",
      can_scroll && node.scrollTop < max_scroll - edge_threshold,
    );
  };
  const schedule_update = () => {
    if (frame === null) frame = requestAnimationFrame(update);
  };
  const resize_observer = new ResizeObserver(schedule_update);
  const mutation_observer = new MutationObserver(schedule_update);

  frame_element.classList.add("glass_scroll_fade");
  node.addEventListener("scroll", schedule_update, { passive: true });
  resize_observer.observe(node);
  mutation_observer.observe(node, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  schedule_update();

  return {
    destroy() {
      node.removeEventListener("scroll", schedule_update);
      resize_observer.disconnect();
      mutation_observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      frame_element.classList.remove("glass_scroll_fade");
      frame_element.removeAttribute("data-scroll-before");
      frame_element.removeAttribute("data-scroll-after");
    },
  };
}
