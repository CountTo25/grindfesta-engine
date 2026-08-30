export function scrollFade(node: HTMLElement) {
  const frame = node.parentElement;
  if (!frame) return {};

  frame.classList.add("glass-scroll-fade");
  const update = () => {
    const before = node.scrollTop > 1;
    const after = node.scrollTop + node.clientHeight < node.scrollHeight - 1;
    frame.toggleAttribute("data-scroll-before", before);
    frame.toggleAttribute("data-scroll-after", after);
  };
  const resizeObserver = new ResizeObserver(update);
  const mutationObserver = new MutationObserver(update);
  resizeObserver.observe(node);
  mutationObserver.observe(node, { childList: true, subtree: true });
  node.addEventListener("scroll", update, { passive: true });
  queueMicrotask(update);

  return {
    update,
    destroy() {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      node.removeEventListener("scroll", update);
      frame.classList.remove("glass-scroll-fade");
      frame.removeAttribute("data-scroll-before");
      frame.removeAttribute("data-scroll-after");
    },
  };
}
