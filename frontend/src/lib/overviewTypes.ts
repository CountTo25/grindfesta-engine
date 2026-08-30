export type OverviewNodeKind = "action" | "location";
export type OverviewRuleKind =
  | "action" | "energy" | "flag" | "item" | "location" | "state" | "timeline";
export type OverviewEdgeKind = "requirement" | "resource" | "reveal" | "state" | "travel";

export type OverviewRule = {
  kind: OverviewRuleKind;
  operation: string;
  targetId?: string;
  targetNodeId?: string;
  resourceKey?: string;
  label: string;
  detail: string;
  negated: boolean;
};

export type OverviewNode = {
  id: string;
  entityUuid: string;
  kind: OverviewNodeKind;
  title: string;
  subtitle: string;
  groupId: string;
  skillId?: string;
  skillName?: string;
  weight?: number;
  repeatable?: boolean;
  conditionJoin?: "and" | "or";
  requirements: OverviewRule[];
  reveals: OverviewRule[];
  effects: OverviewRule[];
};

export type OverviewEdge = {
  id: string;
  from: string;
  to: string;
  kind: OverviewEdgeKind;
  label: string;
  negated: boolean;
};

export type OverviewGraph = {
  nodes: OverviewNode[];
  edges: OverviewEdge[];
  warnings: string[];
};

export type PositionedOverviewNode = OverviewNode & {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OverviewGroup = { id: string; title: string; x: number; count: number };
export type OverviewLayout = {
  nodes: PositionedOverviewNode[];
  groups: OverviewGroup[];
  width: number;
  height: number;
};
