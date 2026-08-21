import {
  read_accent,
  read_element_transform,
  read_length,
  read_visible_rect,
} from "./geometry";
import type {
  Glass_target,
  Resolved_glass_options,
  Scroll_fade_region,
} from "./types";

export class Glass_target_registry {
  private targets = new Map<HTMLElement, Glass_target>();
  private visible_targets = new Set<Glass_target>();
  private intersection_observer: IntersectionObserver;
  private resize_observer: ResizeObserver;

  constructor(
    private options: Resolved_glass_options,
    private invalidate: () => void,
  ) {
    this.intersection_observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const target = this.targets.get(entry.target as HTMLElement);
        if (!target) continue;
        target.visible_rect = entry.isIntersecting ? entry.intersectionRect : null;
        if (entry.isIntersecting) this.visible_targets.add(target);
        else this.visible_targets.delete(target);
      }
      this.invalidate();
    });
    this.resize_observer = new ResizeObserver(this.invalidate);
  }

  refresh(): void {
    const elements = new Set(
      this.options.root.querySelectorAll<HTMLElement>(this.options.selector),
    );
    if (
      this.options.root instanceof HTMLElement &&
      this.options.root.matches(this.options.selector)
    ) elements.add(this.options.root);

    for (const [element, target] of this.targets) {
      if (elements.has(element)) continue;
      this.visible_targets.delete(target);
      this.intersection_observer.unobserve(element);
      this.resize_observer.unobserve(element);
      this.targets.delete(element);
    }

    for (const element of elements) {
      if (this.targets.has(element)) continue;
      const target: Glass_target = {
        element,
        bounds: null,
        local_rect: null,
        transform: null,
        inverse_transform: null,
        visible_rect: null,
        radii: [0, 0, 0, 0],
        accent: [10, 132, 95],
        occludes_reflection: element.matches(this.options.occluder_selector),
      };
      this.targets.set(element, target);
      this.intersection_observer.observe(element);
      this.resize_observer.observe(element);
    }
    this.invalidate();
  }

  cache_geometry(): void {
    for (const target of this.visible_targets) {
      const style = getComputedStyle(target.element);
      target.bounds = target.element.getBoundingClientRect();
      target.visible_rect = read_visible_rect(target.element, target.bounds);
      const geometry = read_element_transform(target.element, target.bounds, style);
      target.local_rect = geometry.local_rect;
      target.transform = geometry.transform;
      target.inverse_transform = geometry.inverse_transform;
      target.accent = read_accent(style, this.options.accent_property);
      target.radii = [
        read_length(style.borderTopLeftRadius),
        read_length(style.borderTopRightRadius),
        read_length(style.borderBottomRightRadius),
        read_length(style.borderBottomLeftRadius),
      ];
      target.occludes_reflection = target.element.matches(
        this.options.occluder_selector,
      );
    }
  }

  render_targets(): Glass_target[] {
    return [...this.visible_targets].sort(
      (left, right) =>
        Number(left.occludes_reflection) - Number(right.occludes_reflection),
    );
  }

  scroll_fade_regions(): Scroll_fade_region[] {
    return Array.from(
      this.options.root.querySelectorAll<HTMLElement>(
        this.options.scroll_fade_selector,
      ),
    ).map((element) => {
      const style = getComputedStyle(element);
      return {
        rect: element.getBoundingClientRect(),
        size: read_length(style.getPropertyValue("--scroll-fade-size")) || 32,
        before: element.hasAttribute("data-scroll-before"),
        after: element.hasAttribute("data-scroll-after"),
      };
    });
  }

  destroy(): void {
    this.intersection_observer.disconnect();
    this.resize_observer.disconnect();
    this.targets.clear();
    this.visible_targets.clear();
  }
}
