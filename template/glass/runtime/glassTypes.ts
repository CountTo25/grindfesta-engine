export type CornerRadii = [number, number, number, number];

export type AffineTransform = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

export type RoundedRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type GlassTarget = {
  element: HTMLElement;
  bounds: DOMRect | null;
  localRect: RoundedRect | null;
  transform: AffineTransform | null;
  inverseTransform: AffineTransform | null;
  visibleRect: DOMRectReadOnly | null;
  radii: CornerRadii;
  accent: [number, number, number];
  occludesReflection: boolean;
  renderable: boolean;
};

export type ScrollFadeRegion = {
  rect: DOMRect;
  size: number;
  before: boolean;
  after: boolean;
};

export type ResolvedGlassOptions = {
  root: HTMLElement;
  selector: string;
  occluderSelector: string;
  scrollFadeSelector: string;
  canvasClass: string;
  accentProperty: string;
  glowRadius: number;
  interiorRadius: number;
  edgeWidth: number;
  maxPixelRatio: number;
};
