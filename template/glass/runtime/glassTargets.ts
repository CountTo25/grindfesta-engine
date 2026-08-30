import {
  readAccent,
  readElementTransform,
  readLength,
  readVisibleRect,
} from "./glassGeometry";
import type {
  GlassTarget,
  ResolvedGlassOptions,
  ScrollFadeRegion,
} from "./glassTypes";

export class GlassTargetRegistry {
  private targets = new Map<HTMLElement, GlassTarget>();
  private visibleTargets = new Set<GlassTarget>();
  private intersectionObserver: IntersectionObserver;
  private resizeObserver: ResizeObserver;

  constructor(
    private options: ResolvedGlassOptions,
    private invalidate: () => void,
  ) {
    this.intersectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const target = this.targets.get(entry.target as HTMLElement);
        if (!target) continue;
        target.visibleRect = entry.isIntersecting ? entry.intersectionRect : null;
        if (entry.isIntersecting) this.visibleTargets.add(target);
        else this.visibleTargets.delete(target);
      }
      this.invalidate();
    });
    this.resizeObserver = new ResizeObserver(this.invalidate);
  }

  refresh(): void {
    const elements = new Set(
      this.options.root.querySelectorAll<HTMLElement>(this.options.selector),
    );
    if (this.options.root.matches(this.options.selector)) {
      elements.add(this.options.root);
    }

    for (const [element, target] of this.targets) {
      if (elements.has(element)) continue;
      this.visibleTargets.delete(target);
      this.intersectionObserver.unobserve(element);
      this.resizeObserver.unobserve(element);
      this.targets.delete(element);
    }

    for (const element of elements) {
      if (this.targets.has(element)) continue;
      const target: GlassTarget = {
        element,
        bounds: null,
        localRect: null,
        transform: null,
        inverseTransform: null,
        visibleRect: null,
        radii: [0, 0, 0, 0],
        accent: [4, 120, 87],
        occludesReflection: element.matches(this.options.occluderSelector),
        renderable: false,
      };
      this.targets.set(element, target);
      this.intersectionObserver.observe(element);
      this.resizeObserver.observe(element);
    }
    this.invalidate();
  }

  cacheGeometry(): void {
    for (const target of this.visibleTargets) {
      const style = getComputedStyle(target.element);
      target.renderable = style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number.parseFloat(style.opacity) > 0;
      target.bounds = target.element.getBoundingClientRect();
      target.visibleRect = readVisibleRect(target.element, target.bounds);
      const geometry = readElementTransform(target.element, target.bounds, style);
      target.localRect = geometry.localRect;
      target.transform = geometry.transform;
      target.inverseTransform = geometry.inverseTransform;
      target.accent = readAccent(style, this.options.accentProperty);
      target.radii = [
        readLength(style.borderTopLeftRadius),
        readLength(style.borderTopRightRadius),
        readLength(style.borderBottomRightRadius),
        readLength(style.borderBottomLeftRadius),
      ];
      target.occludesReflection = target.element.matches(
        this.options.occluderSelector,
      );
    }
  }

  renderTargets(): GlassTarget[] {
    return [...this.visibleTargets].filter(({ renderable }) => renderable).sort(
      (left, right) =>
        Number(left.occludesReflection) - Number(right.occludesReflection),
    );
  }

  scrollFadeRegions(): ScrollFadeRegion[] {
    return Array.from(
      this.options.root.querySelectorAll<HTMLElement>(
        this.options.scrollFadeSelector,
      ),
    ).map((element) => {
      const style = getComputedStyle(element);
      return {
        rect: element.getBoundingClientRect(),
        size: readLength(style.getPropertyValue("--scroll-fade-size")) || 32,
        before: element.hasAttribute("data-scroll-before"),
        after: element.hasAttribute("data-scroll-after"),
      };
    });
  }

  destroy(): void {
    this.intersectionObserver.disconnect();
    this.resizeObserver.disconnect();
    this.targets.clear();
    this.visibleTargets.clear();
  }
}
