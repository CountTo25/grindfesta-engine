import { eraseScrollFades } from "./glassFadePainter";
import { paintTarget } from "./glassReflectionPainter";
import type {
  GlassTarget,
  ResolvedGlassOptions,
  ScrollFadeRegion,
} from "./glassTypes";

export type ReflectionCanvas = {
  render: (
    pointer: { x: number; y: number } | null,
    targets: GlassTarget[],
    fades: ScrollFadeRegion[],
  ) => void;
  resize: () => void;
  destroy: () => void;
};

export function createReflectionCanvas(
  options: ResolvedGlassOptions,
): ReflectionCanvas | null {
  const canvas = document.createElement("canvas");
  canvas.className = options.canvasClass;
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);
  const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!context) {
    canvas.remove();
    return null;
  }
  const canvasSize = options.glowRadius * 2;
  let pixelRatio = 1;

  const resize = () => {
    pixelRatio = Math.min(window.devicePixelRatio || 1, options.maxPixelRatio);
    canvas.width = Math.round(canvasSize * pixelRatio);
    canvas.height = Math.round(canvasSize * pixelRatio);
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
  };

  const render = (
    pointer: { x: number; y: number } | null,
    targets: GlassTarget[],
    fades: ScrollFadeRegion[],
  ) => {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!pointer) return;
    const originX = pointer.x - options.glowRadius;
    const originY = pointer.y - options.glowRadius;
    canvas.style.transform = `translate3d(${originX}px, ${originY}px, 0)`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    for (const target of targets) {
      paintTarget(context, target, pointer, options, pixelRatio);
    }
    eraseScrollFades(context, fades, originX, originY, canvasSize);
  };

  resize();
  return { render, resize, destroy: () => canvas.remove() };
}
