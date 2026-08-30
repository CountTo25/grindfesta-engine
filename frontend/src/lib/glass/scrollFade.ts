const edgeThreshold = 1;

export function glassScrollFade(node: HTMLElement) {
  const frameElement = node.parentElement;
  if (!frameElement) return;
  let frame: number | null = null;

  const update = () => {
    frame = null;
    const maxScroll = Math.max(0, node.scrollHeight - node.clientHeight);
    const canScroll = maxScroll > edgeThreshold;
    frameElement.toggleAttribute(
      "data-scroll-before",
      canScroll && node.scrollTop > edgeThreshold,
    );
    frameElement.toggleAttribute(
      "data-scroll-after",
      canScroll && node.scrollTop < maxScroll - edgeThreshold,
    );
  };
  const scheduleUpdate = () => {
    if (frame === null) frame = requestAnimationFrame(update);
  };
  const resizeObserver = new ResizeObserver(scheduleUpdate);
  const mutationObserver = new MutationObserver(scheduleUpdate);

  frameElement.classList.add("glass-scroll-fade");
  node.addEventListener("scroll", scheduleUpdate, { passive: true });
  resizeObserver.observe(node);
  mutationObserver.observe(node, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  scheduleUpdate();

  return {
    destroy() {
      node.removeEventListener("scroll", scheduleUpdate);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      frameElement.classList.remove("glass-scroll-fade");
      frameElement.removeAttribute("data-scroll-before");
      frameElement.removeAttribute("data-scroll-after");
    },
  };
}
