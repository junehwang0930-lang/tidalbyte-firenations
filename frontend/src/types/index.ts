// Mirror backend/app/models.py. Keep JSON field names unchanged.
export interface GraphNode {
  id: string;
  areaId: string;
  x: number;
  y: number;
  floor: number;
  kind: 'room' | 'corridor' | 'junction' | 'exit';
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  distance: number;
  bidirectional: boolean;
}

export interface BuildingGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  exitNodeIds: string[];
}

export interface AreaHazard {
  id: string;
  // Omitted or null means unknown. Zero is a known illustrative score.
  fireRisk?: number | null;
  smokeRisk?: number | null;
}

export interface HazardSnapshot {
  time: number;
  areas: AreaHazard[];
  blockedEdges: string[];
}

export interface UserLocation {
  currentNodeId: string;
}

export interface RouteResult {
  status: 'ok' | 'no_route' | 'invalid_input';
  nodeIds: string[];
  edgeIds: string[];
  totalCost: number | null;
  exitNodeId: string | null;
}

export interface HealthResponse {
  status: 'ok';
}
