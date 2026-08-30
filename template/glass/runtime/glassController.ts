import { createReflectionCanvas } from "./glassReflectionCanvas";
import { GlassTargetRegistry } from "./glassTargets";
import type { ResolvedGlassOptions } from "./glassTypes";

function hasGlass(
  target: EventTarget | null,
  selector: string,
  includeAncestors = false,
): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.matches(selector) ||
      target.querySelector(selector) ||
      (includeAncestors && target.closest(selector)),
  );
}

export function mountGlassReflections(
  options: ResolvedGlassOptions,
): (() => void) | undefined {
  if (!window.matchMedia("(pointer: fine)").matches) return;
  const canvas = createReflectionCanvas(options);
  if (!canvas) return;

  let pointer: { x: number; y: number } | null = null;
  let frame: number | null = null;
  let geometryDirty = true;
  let movingGeometryCount = 0;
  const movingTargets = new Map<EventTarget, number>();

  const render = () => {
    frame = null;
    if (geometryDirty) registry.cacheGeometry();
    canvas.render(pointer, registry.renderTargets(), registry.scrollFadeRegions());
    geometryDirty = false;
    if (movingGeometryCount > 0) {
      geometryDirty = true;
      scheduleRender();
    }
  };
  const scheduleRender = () => {
    if (frame === null) frame = requestAnimationFrame(render);
  };
  const invalidateGeometry = () => {
    geometryDirty = true;
    scheduleRender();
  };
  const registry = new GlassTargetRegistry(options, invalidateGeometry);

  const handlePointerMove = (event: PointerEvent) => {
    pointer = { x: event.clientX, y: event.clientY };
    scheduleRender();
  };
  const handlePointerExit = (event: PointerEvent) => {
    if (event.relatedTarget !== null) return;
    pointer = null;
    scheduleRender();
  };
  const handleMotionStart = (event: Event) => {
    const target = event.target;
    if (!target || !hasGlass(target, options.selector)) return;
    movingTargets.set(target, (movingTargets.get(target) ?? 0) + 1);
    movingGeometryCount += 1;
    invalidateGeometry();
  };
  const handleMotionEnd = (event: Event) => {
    const target = event.target;
    if (!target) return;
    const count = movingTargets.get(target) ?? 0;
    if (count === 0) return;
    if (count === 1) movingTargets.delete(target);
    else movingTargets.set(target, count - 1);
    movingGeometryCount = Math.max(0, movingGeometryCount - 1);
    invalidateGeometry();
  };
  const handleResize = () => {
    canvas.resize();
    invalidateGeometry();
  };

  const mutationObserver = new MutationObserver((records) => {
    if (
      records.some(
        (record) => record.type === "childList" || record.attributeName === "class",
      )
    ) {
      registry.refresh();
      return;
    }
    if (
      records.some(
        (record) =>
          record.attributeName?.startsWith("data-scroll-") ||
          hasGlass(record.target, options.selector, true),
      )
    ) invalidateGeometry();
  });
  const eventController = new AbortController();
  const eventOptions = { passive: true, signal: eventController.signal };

  registry.refresh();
  mutationObserver.observe(options.root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "class",
      "style",
      "data-glass-occluder",
      "data-scroll-before",
      "data-scroll-after",
    ],
  });
  window.addEventListener("pointermove", handlePointerMove, eventOptions);
  window.addEventListener("pointerout", handlePointerExit, eventOptions);
  window.addEventListener("resize", handleResize, eventOptions);
  window.addEventListener("scroll", invalidateGeometry, {
    ...eventOptions,
    capture: true,
  });
  for (const name of ["pointerover", "pointerout", "focusin", "focusout"]) {
    document.addEventListener(name, (event) => {
      if (hasGlass(event.target, options.selector, true)) invalidateGeometry();
    }, eventOptions);
  }
  for (const name of ["transitionrun", "animationstart"]) {
    document.addEventListener(name, handleMotionStart, eventOptions);
  }
  for (const name of [
    "transitionend",
    "transitioncancel",
    "animationend",
    "animationcancel",
  ]) {
    document.addEventListener(name, handleMotionEnd, eventOptions);
  }

  return () => {
    mutationObserver.disconnect();
    registry.destroy();
    if (frame !== null) cancelAnimationFrame(frame);
    eventController.abort();
    canvas.destroy();
  };
}
