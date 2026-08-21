import type {
  Affine_transform,
  Corner_radii,
  Rounded_rect,
} from "./types";

export function read_length(value: string): number {
  const length = Number.parseFloat(value);
  return Number.isFinite(length) ? length : 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function nearest_point_on_rounded_edge(
  x: number,
  y: number,
  rect: Rounded_rect,
  radii: Corner_radii,
): { x: number; y: number } {
  const radius = clamp(
    Math.max(...radii),
    0,
    Math.min(rect.width, rect.height) / 2,
  );
  const center_x = (rect.left + rect.right) / 2;
  const center_y = (rect.top + rect.bottom) / 2;
  const half_width = rect.width / 2;
  const half_height = rect.height / 2;
  const relative_x = x - center_x;
  const relative_y = y - center_y;
  const inner_x = clamp(relative_x, radius - half_width, half_width - radius);
  const inner_y = clamp(relative_y, radius - half_height, half_height - radius);
  const delta_x = relative_x - inner_x;
  const delta_y = relative_y - inner_y;
  const corner_distance = Math.hypot(delta_x, delta_y);

  if (corner_distance > 0) {
    return {
      x: center_x + inner_x + (delta_x / corner_distance) * radius,
      y: center_y + inner_y + (delta_y / corner_distance) * radius,
    };
  }
  if (half_width - Math.abs(relative_x) < half_height - Math.abs(relative_y)) {
    return { x: relative_x < 0 ? rect.left : rect.right, y };
  }
  return { x, y: relative_y <= 0 ? rect.top : rect.bottom };
}

function multiply_transforms(
  outer: Affine_transform,
  inner: Affine_transform,
): Affine_transform {
  return {
    a: outer.a * inner.a + outer.c * inner.b,
    b: outer.b * inner.a + outer.d * inner.b,
    c: outer.a * inner.c + outer.c * inner.d,
    d: outer.b * inner.c + outer.d * inner.d,
    e: outer.a * inner.e + outer.c * inner.f + outer.e,
    f: outer.b * inner.e + outer.d * inner.f + outer.f,
  };
}

function invert_transform(transform: Affine_transform): Affine_transform | null {
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

export function transform_point(
  transform: Affine_transform,
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: transform.a * x + transform.c * y + transform.e,
    y: transform.b * x + transform.d * y + transform.f,
  };
}

function read_border_box_length(
  element: HTMLElement,
  style: CSSStyleDeclaration,
  axis: "width" | "height",
): number {
  const length = read_length(style[axis]);
  if (length <= 0) return axis === "width" ? element.offsetWidth : element.offsetHeight;
  if (style.boxSizing === "border-box") return length;
  const additions = axis === "width"
    ? [style.paddingLeft, style.paddingRight, style.borderLeftWidth, style.borderRightWidth]
    : [style.paddingTop, style.paddingBottom, style.borderTopWidth, style.borderBottomWidth];
  return length + additions.reduce((sum, value) => sum + read_length(value), 0);
}

export function read_element_transform(
  element: HTMLElement,
  bounds: DOMRect,
  style: CSSStyleDeclaration,
): {
  local_rect: Rounded_rect;
  transform: Affine_transform;
  inverse_transform: Affine_transform | null;
} {
  const width = read_border_box_length(element, style, "width");
  const height = read_border_box_length(element, style, "height");
  const local_rect = { left: 0, top: 0, right: width, bottom: height, width, height };
  let linear: Affine_transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    const value = getComputedStyle(current).transform;
    if (value === "none") continue;
    const matrix = new DOMMatrixReadOnly(value);
    linear = multiply_transforms(
      { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: 0, f: 0 },
      linear,
    );
  }

  const corners = [
    transform_point(linear, 0, 0),
    transform_point(linear, width, 0),
    transform_point(linear, 0, height),
    transform_point(linear, width, height),
  ];
  const transform = {
    ...linear,
    e: bounds.left - Math.min(...corners.map(({ x }) => x)),
    f: bounds.top - Math.min(...corners.map(({ y }) => y)),
  };
  return { local_rect, transform, inverse_transform: invert_transform(transform) };
}

export function read_accent(
  style: CSSStyleDeclaration,
  property: string,
): [number, number, number] {
  const channels = style.getPropertyValue(property).match(/[\d.]+/g)?.slice(0, 3).map(Number);
  return channels?.length === 3 ? [channels[0], channels[1], channels[2]] : [10, 132, 95];
}

export function read_visible_rect(
  element: HTMLElement,
  bounds: DOMRect,
): DOMRectReadOnly {
  let left = Math.max(0, bounds.left);
  let top = Math.max(0, bounds.top);
  let right = Math.min(window.innerWidth, bounds.right);
  let bottom = Math.min(window.innerHeight, bounds.bottom);
  for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
    const style = getComputedStyle(ancestor);
    const clips_x = style.overflowX !== "visible";
    const clips_y = style.overflowY !== "visible";
    if (!clips_x && !clips_y) continue;
    const rect = ancestor.getBoundingClientRect();
    if (clips_x) {
      left = Math.max(left, rect.left);
      right = Math.min(right, rect.right);
    }
    if (clips_y) {
      top = Math.max(top, rect.top);
      bottom = Math.min(bottom, rect.bottom);
    }
  }
  return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
}
