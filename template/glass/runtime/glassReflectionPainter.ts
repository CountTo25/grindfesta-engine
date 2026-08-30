import {
  nearestPointOnRoundedEdge,
  transformPoint,
} from "./glassGeometry";
import type { GlassTarget, ResolvedGlassOptions } from "./glassTypes";

function createTargetPath(
  target: GlassTarget,
  options: ResolvedGlassOptions,
  originX: number,
  originY: number,
): Path2D | null {
  if (!target.localRect || !target.transform) return null;
  const path = new Path2D();
  const inset = options.edgeWidth / 2;
  path.roundRect(
    inset,
    inset,
    Math.max(0, target.localRect.width - options.edgeWidth),
    Math.max(0, target.localRect.height - options.edgeWidth),
    target.radii,
  );
  const canvasPath = new Path2D();
  const transform = target.transform;
  canvasPath.addPath(
    path,
    new DOMMatrix([
      transform.a,
      transform.b,
      transform.c,
      transform.d,
      transform.e - originX,
      transform.f - originY,
    ]),
  );
  return canvasPath;
}

function paintInterior(
  context: CanvasRenderingContext2D,
  path: Path2D,
  point: { x: number; y: number },
  accent: [number, number, number],
  strength: number,
  radius: number,
): void {
  const [red, green, blue] = accent;
  const gradient = context.createRadialGradient(
    point.x,
    point.y,
    0,
    point.x,
    point.y,
    radius,
  );
  gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${0.06 * strength})`);
  gradient.addColorStop(0.44, `rgba(${red}, ${green}, ${blue}, ${0.024 * strength})`);
  gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);
  context.save();
  context.clip(path);
  context.fillStyle = gradient;
  context.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2);
  context.restore();
}

function paintEdge(
  context: CanvasRenderingContext2D,
  path: Path2D,
  accent: [number, number, number],
  options: ResolvedGlassOptions,
): void {
  const [red, green, blue] = accent;
  const center = options.glowRadius;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, 0.34)`);
  gradient.addColorStop(0.38, `rgba(${red}, ${green}, ${blue}, 0.17)`);
  gradient.addColorStop(0.72, `rgba(${red}, ${green}, ${blue}, 0.055)`);
  gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);
  context.lineWidth = options.edgeWidth;
  context.strokeStyle = gradient;
  context.stroke(path);
}

export function paintTarget(
  context: CanvasRenderingContext2D,
  target: GlassTarget,
  pointer: { x: number; y: number },
  options: ResolvedGlassOptions,
  pixelRatio: number,
): void {
  const { bounds, localRect, transform, inverseTransform, visibleRect } = target;
  if (!bounds || !localRect || !transform || !inverseTransform || !visibleRect) return;
  const originX = pointer.x - options.glowRadius;
  const originY = pointer.y - options.glowRadius;
  const canvasSize = options.glowRadius * 2;
  const left = Math.max(bounds.left, visibleRect.left);
  const top = Math.max(bounds.top, visibleRect.top);
  const right = Math.min(bounds.right, visibleRect.right);
  const bottom = Math.min(bounds.bottom, visibleRect.bottom);
  if (
    right <= left || bottom <= top || right < originX ||
    left > originX + canvasSize || bottom < originY || top > originY + canvasSize
  ) return;

  context.save();
  context.beginPath();
  context.rect(left - originX, top - originY, right - left, bottom - top);
  context.clip();
  const path = createTargetPath(target, options, originX, originY);
  if (!path) {
    context.restore();
    return;
  }
  if (target.occludesReflection) {
    context.save();
    context.globalCompositeOperation = "destination-out";
    context.fillStyle = "#000";
    context.fill(path);
    context.restore();
  }

  const localPointer = transformPoint(inverseTransform, pointer.x, pointer.y);
  const localPoint = nearestPointOnRoundedEdge(
    localPointer.x,
    localPointer.y,
    localRect,
    target.radii,
  );
  const reflection = transformPoint(transform, localPoint.x, localPoint.y);
  const distance = Math.hypot(pointer.x - reflection.x, pointer.y - reflection.y);
  const strength = Math.max(0, 1 - distance / options.glowRadius) ** 2;
  if (strength === 0) {
    context.restore();
    return;
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  const canvasPoint = { x: reflection.x - originX, y: reflection.y - originY };
  paintInterior(
    context,
    path,
    canvasPoint,
    target.accent,
    strength,
    options.interiorRadius,
  );
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  paintEdge(context, path, target.accent, options);
  context.restore();
}
