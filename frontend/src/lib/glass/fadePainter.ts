import type { ScrollFadeRegion } from "./types";

function eraseFade(
  context: CanvasRenderingContext2D,
  region: ScrollFadeRegion,
  originX: number,
  originY: number,
  edge: "before" | "after",
): void {
  const left = region.rect.left - originX;
  const top =
    (edge === "before" ? region.rect.top : region.rect.bottom - region.size) -
    originY;
  const gradient = context.createLinearGradient(0, top, 0, top + region.size);
  if (edge === "before") {
    gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(0.48, "rgba(0, 0, 0, 0.62)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  } else {
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(0.52, "rgba(0, 0, 0, 0.62)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 1)");
  }
  context.fillStyle = gradient;
  context.fillRect(left, top, region.rect.width, region.size);
}

export function eraseScrollFades(
  context: CanvasRenderingContext2D,
  regions: ScrollFadeRegion[],
  originX: number,
  originY: number,
  canvasSize: number,
): void {
  context.save();
  context.globalCompositeOperation = "destination-out";
  for (const region of regions) {
    if (
      region.rect.right < originX ||
      region.rect.left > originX + canvasSize ||
      region.rect.bottom < originY ||
      region.rect.top > originY + canvasSize
    ) continue;
    if (region.before) eraseFade(context, region, originX, originY, "before");
    if (region.after) eraseFade(context, region, originX, originY, "after");
  }
  context.restore();
}
