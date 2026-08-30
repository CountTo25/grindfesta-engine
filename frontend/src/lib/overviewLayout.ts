import type {
  OverviewGroup, OverviewLayout, OverviewNode, PositionedOverviewNode,
} from "./overviewTypes";

const nodeWidth = 264;
const locationHeight = 78;
const actionHeight = 108;
const columnGap = 56;
const rowGap = 14;
const padding = 32;

export function layoutOverview(nodes: OverviewNode[]): OverviewLayout {
  const locations = nodes.filter((node) => node.kind === "location");
  const actions = nodes.filter((node) => node.kind === "action");
  const groups = locations.map((node) => ({ id: node.groupId, title: node.title }));
  if (actions.some((node) => node.groupId === "anywhere")) {
    groups.unshift({ id: "anywhere", title: "Anywhere" });
  }
  const positioned: PositionedOverviewNode[] = [];
  const laidOutGroups: OverviewGroup[] = [];
  let tallest = 0;

  groups.forEach((group, index) => {
    const x = padding + index * (nodeWidth + columnGap);
    const location = locations.find((node) => node.groupId === group.id);
    const groupedActions = actions.filter((node) => node.groupId === group.id);
    let y = 52;
    laidOutGroups.push({ ...group, x, count: groupedActions.length });
    if (location) {
      positioned.push(positionNode(location, x, y, locationHeight));
      y += locationHeight + 30;
    }
    for (const action of groupedActions) {
      positioned.push(positionNode(action, x, y, actionHeight));
      y += actionHeight + rowGap;
    }
    tallest = Math.max(tallest, y);
  });

  return {
    nodes: positioned,
    groups: laidOutGroups,
    width: Math.max(720, padding * 2 + groups.length * nodeWidth +
      Math.max(0, groups.length - 1) * columnGap),
    height: Math.max(520, tallest + padding),
  };
}

function positionNode(node: OverviewNode, x: number, y: number, height: number) {
  return { ...node, x, y, width: nodeWidth, height };
}

export function overviewEdgePath(
  source: PositionedOverviewNode,
  target: PositionedOverviewNode,
) {
  if (Math.abs(source.x - target.x) < 2) return verticalPath(source, target);
  const movingRight = target.x > source.x;
  const startX = movingRight ? source.x + source.width : source.x;
  const endX = movingRight ? target.x : target.x + target.width;
  const startY = source.y + source.height / 2;
  const endY = target.y + target.height / 2;
  const bend = Math.max(42, Math.abs(endX - startX) * 0.46);
  const first = startX + (movingRight ? bend : -bend);
  const second = endX + (movingRight ? -bend : bend);
  return `M ${startX} ${startY} C ${first} ${startY}, ${second} ${endY}, ${endX} ${endY}`;
}

function verticalPath(source: PositionedOverviewNode, target: PositionedOverviewNode) {
  const targetBelow = target.y > source.y;
  const startX = source.x + source.width / 2;
  const endX = target.x + target.width / 2;
  const startY = targetBelow ? source.y + source.height : source.y;
  const endY = targetBelow ? target.y : target.y + target.height;
  const bend = Math.max(32, Math.abs(endY - startY) * 0.45);
  return `M ${startX} ${startY} C ${startX} ${startY + (targetBelow ? bend : -bend)}, ` +
    `${endX} ${endY + (targetBelow ? -bend : bend)}, ${endX} ${endY}`;
}
