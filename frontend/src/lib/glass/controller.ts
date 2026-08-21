import { create_reflection_canvas } from "./reflection_canvas";
import { Glass_target_registry } from "./targets";
import type { Resolved_glass_options } from "./types";

function has_glass(
  target: EventTarget | null,
  selector: string,
  include_ancestors = false,
): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.matches(selector) ||
      target.querySelector(selector) ||
      (include_ancestors && target.closest(selector)),
  );
}

export function mount_glass_reflections(
  options: Resolved_glass_options,
): (() => void) | undefined {
  if (!window.matchMedia("(pointer: fine)").matches) return;
  const canvas = create_reflection_canvas(options);
  if (!canvas) return;

  let pointer: { x: number; y: number } | null = null;
  let frame: number | null = null;
  let geometry_dirty = true;
  let moving_geometry_count = 0;
  const moving_targets = new Map<EventTarget, number>();

  const render = () => {
    frame = null;
    if (geometry_dirty) registry.cache_geometry();
    canvas.render(
      pointer,
      registry.render_targets(),
      registry.scroll_fade_regions(),
    );
    geometry_dirty = false;
    if (moving_geometry_count > 0) {
      geometry_dirty = true;
      schedule_render();
    }
  };
  const schedule_render = () => {
    if (frame === null) frame = requestAnimationFrame(render);
  };
  const invalidate_geometry = () => {
    geometry_dirty = true;
    schedule_render();
  };
  const registry = new Glass_target_registry(options, invalidate_geometry);

  const handle_pointer_move = (event: PointerEvent) => {
    pointer = { x: event.clientX, y: event.clientY };
    schedule_render();
  };
  const handle_pointer_exit = (event: PointerEvent) => {
    if (event.relatedTarget !== null) return;
    pointer = null;
    schedule_render();
  };
  const handle_motion_start = (event: Event) => {
    const target = event.target;
    if (!target || !has_glass(target, options.selector)) return;
    moving_targets.set(target, (moving_targets.get(target) ?? 0) + 1);
    moving_geometry_count += 1;
    invalidate_geometry();
  };
  const handle_motion_end = (event: Event) => {
    const target = event.target;
    if (!target) return;
    const count = moving_targets.get(target) ?? 0;
    if (count === 0) return;
    if (count === 1) moving_targets.delete(target);
    else moving_targets.set(target, count - 1);
    moving_geometry_count = Math.max(0, moving_geometry_count - 1);
    invalidate_geometry();
  };
  const handle_resize = () => {
    canvas.resize();
    invalidate_geometry();
  };

  const mutation_observer = new MutationObserver((records) => {
    if (
      records.some(
        (record) =>
          record.type === "childList" || record.attributeName === "class",
      )
    ) {
      registry.refresh();
      return;
    }
    if (
      records.some(
        (record) =>
          record.attributeName?.startsWith("data-scroll-") ||
          has_glass(record.target, options.selector, true),
      )
    ) invalidate_geometry();
  });
  const event_controller = new AbortController();
  const event_options = { passive: true, signal: event_controller.signal };
  const mutation_root = options.root instanceof Document
    ? options.root.body
    : options.root;

  registry.refresh();
  mutation_observer.observe(mutation_root, {
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
  window.addEventListener("pointermove", handle_pointer_move, event_options);
  window.addEventListener("pointerout", handle_pointer_exit, event_options);
  window.addEventListener("resize", handle_resize, event_options);
  window.addEventListener("scroll", invalidate_geometry, {
    ...event_options,
    capture: true,
  });
  for (const name of ["pointerover", "pointerout", "focusin", "focusout"]) {
    document.addEventListener(name, (event) => {
      if (has_glass(event.target, options.selector, true)) invalidate_geometry();
    }, event_options);
  }
  for (const name of ["transitionrun", "animationstart"]) {
    document.addEventListener(name, handle_motion_start, event_options);
  }
  for (const name of [
    "transitionend",
    "transitioncancel",
    "animationend",
    "animationcancel",
  ]) {
    document.addEventListener(name, handle_motion_end, event_options);
  }

  return () => {
    mutation_observer.disconnect();
    registry.destroy();
    if (frame !== null) cancelAnimationFrame(frame);
    event_controller.abort();
    canvas.destroy();
  };
}
