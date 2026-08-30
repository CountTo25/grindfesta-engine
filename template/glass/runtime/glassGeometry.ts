import type { AffineTransform, CornerRadii, RoundedRect } from "./glassTypes";

export function readLength(value: string): number {
  const length = Number.parseFloat(value);
  return Number.isFinite(length) ? length : 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function nearestPointOnRoundedEdge(
  x: number,
  y: number,
  rect: RoundedRect,
  radii: CornerRadii,
): { x: number; y: number } {
  const radius = clamp(
    Math.max(...radii),
    0,
    Math.min(rect.width, rect.height) / 2,
  );
  const centerX = (rect.left + rect.right) / 2;
  const centerY = (rect.top + rect.bottom) / 2;
  const halfWidth = rect.width / 2;
  const halfHeight = rect.height / 2;
  const relativeX = x - centerX;
  const relativeY = y - centerY;
  const innerX = clamp(relativeX, radius - halfWidth, halfWidth - radius);
  const innerY = clamp(relativeY, radius - halfHeight, halfHeight - radius);
  const deltaX = relativeX - innerX;
  const deltaY = relativeY - innerY;
  const cornerDistance = Math.hypot(deltaX, deltaY);

  if (cornerDistance > 0) {
    return {
      x: centerX + innerX + (deltaX / cornerDistance) * radius,
      y: centerY + innerY + (deltaY / cornerDistance) * radius,
    };
  }
  if (halfWidth - Math.abs(relativeX) < halfHeight - Math.abs(relativeY)) {
    return { x: relativeX < 0 ? rect.left : rect.right, y };
  }
  return { x, y: relativeY <= 0 ? rect.top : rect.bottom };
}

function multiplyTransforms(
  outer: AffineTransform,
  inner: AffineTransform,
): AffineTransform {
  return {
    a: outer.a * inner.a + outer.c * inner.b,
    b: outer.b * inner.a + outer.d * inner.b,
    c: outer.a * inner.c + outer.c * inner.d,
    d: outer.b * inner.c + outer.d * inner.d,
    e: outer.a * inner.e + outer.c * inner.f + outer.e,
    f: outer.b * inner.e + outer.d * inner.f + outer.f,
  };
}

function invertTransform(transform: AffineTransform): AffineTransform | null {
  const determinant = transform.a * transform.d - transform.b * transform.c;
  if (Math.abs(determinant) < Number.EPSILON) return null;
  return {
    a: transform.d / determinant,
    b: -transform.b / determinant,
    c: -transform.c / determinant,
    d: transform.a / determinant,
    e: (transform.c * transform.f - transform.d * transform.e) / determinant,
    f: (transform.b * transform.e - transform.a * transform.f) / determinant,
  };
}

export function transformPoint(
  transform: AffineTransform,
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: transform.a * x + transform.c * y + transform.e,
    y: transform.b * x + transform.d * y + transform.f,
  };
}

function readBorderBoxLength(
  element: HTMLElement,
  style: CSSStyleDeclaration,
  axis: "width" | "height",
): number {
  const length = readLength(style[axis]);
  if (length <= 0) return axis === "width" ? element.offsetWidth : element.offsetHeight;
  if (style.boxSizing === "border-box") return length;
  const additions = axis === "width"
    ? [style.paddingLeft, style.paddingRight, style.borderLeftWidth, style.borderRightWidth]
    : [style.paddingTop, style.paddingBottom, style.borderTopWidth, style.borderBottomWidth];
  return length + additions.reduce((sum, value) => sum + readLength(value), 0);
}

export function readElementTransform(
  element: HTMLElement,
  bounds: DOMRect,
  style: CSSStyleDeclaration,
) {
  const width = readBorderBoxLength(element, style, "width");
  const height = readBorderBoxLength(element, style, "height");
  const localRect = { left: 0, top: 0, right: width, bottom: height, width, height };
  let linear: AffineTransform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    const value = getComputedStyle(current).transform;
    if (value === "none") continue;
    const matrix = new DOMMatrixReadOnly(value);
    linear = multiplyTransforms(
      { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: 0, f: 0 },
      linear,
    );
  }

  const corners = [
    transformPoint(linear, 0, 0),
    transformPoint(linear, width, 0),
    transformPoint(linear, 0, height),
    transformPoint(linear, width, height),
  ];
  const transform = {
    ...linear,
    e: bounds.left - Math.min(...corners.map(({ x }) => x)),
    f: bounds.top - Math.min(...corners.map(({ y }) => y)),
  };
  return { localRect, transform, inverseTransform: invertTransform(transform) };
}

export function readAccent(
  style: CSSStyleDeclaration,
  property: string,
): [number, number, number] {
  const value = style.getPropertyValue(property).trim();
  const hex = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value);
  if (hex) {
    return [
      Number.parseInt(hex[1], 16),
      Number.parseInt(hex[2], 16),
      Number.parseInt(hex[3], 16),
    ];
  }
  const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  return channels?.length === 3 ? [channels[0], channels[1], channels[2]] : [4, 120, 87];
}

export function readVisibleRect(element: HTMLElement, bounds: DOMRect): DOMRectReadOnly {
  let left = Math.max(0, bounds.left);
  let top = Math.max(0, bounds.top);
  let right = Math.min(window.innerWidth, bounds.right);
  let bottom = Math.min(window.innerHeight, bounds.bottom);
  for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
    const style = getComputedStyle(ancestor);
    const clipsX = style.overflowX !== "visible";
    const clipsY = style.overflowY !== "visible";
    if (!clipsX && !clipsY) continue;
    const rect = ancestor.getBoundingClientRect();
    if (clipsX) {
      left = Math.max(left, rect.left);
      right = Math.min(right, rect.right);
    }
    if (clipsY) {
      top = Math.max(top, rect.top);
      bottom = Math.min(bottom, rect.bottom);
    }
  }
  return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
}
