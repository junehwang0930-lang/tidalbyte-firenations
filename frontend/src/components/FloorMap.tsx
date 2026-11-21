import { useId } from 'react';
import type { GraphNode } from '../types';

export type Floor = 1 | 2 | 3;
export const floors: Floor[] = [1, 2, 3];

const plans = {
  1: {
    walls: 'M0 84H28m24 0h76m24 0h128M0 116h280M91 0v84m98-84v84M70 116v41m120-41v41',
    labels: [[40, 23, 'Room A'], [140, 23, 'Room B'], [234, 41, 'Commons'], [128, 141, 'Lobby'],
      [0, 172, 'West exit'], [280, 172, 'East exit']],
  },
  2: {
    walls: 'M0 65h46m22 0h78m22 0h112M0 99h107m22 0h151M106 0v65m104-65v65M80 99v58m118-58v58',
    labels: [[51, 33, 'Study room'], [156, 33, 'Meeting room'], [246, 33, 'Stairs'],
      [40, 130, 'Elevator'], [136, 130, 'Gallery'], [239, 130, 'Lounge']],
  },
  3: {
    walls: 'M0 77h36m22 0h126m22 0h74M0 110h88m24 0h168M94 0v77m86-77v77M64 110v47m145-47v47',
    labels: [[47, 38, 'Seminar room'], [137, 38, 'Studio'], [231, 38, 'Stairs'],
      [32, 137, 'Elevator'], [137, 137, 'Reading room'], [245, 137, 'Terrace']],
  },
} satisfies Record<Floor, { walls: string; labels: [number, number, string][] }>;

export default function FloorMap({ floor, route, radius, fire }: {
  floor: Floor;
  route: GraphNode[];
  radius: number;
  fire?: GraphNode;
}) {
  const gradient = useId();
  const plan = plans[floor];
  const start = route[0];
  const routePoints = route.map(node => `${node.x},${node.y}`).join(' ');
  return (
    <svg className="floor-map" viewBox="-26 -16 332 198" role="img"
      aria-label={`Fictional floor ${floor} plan${fire ? ' with simulated fire' : ''}${start ? ' and sample route' : ''}`}>
      <defs>
        <radialGradient id={gradient}>
          <stop stopColor="#cf3627" stopOpacity=".62" />
          <stop offset=".56" stopColor="#efad39" stopOpacity=".42" />
          <stop offset=".85" stopColor="#aab35c" stopOpacity=".25" />
          <stop offset="1" stopColor="#aab35c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect className="rooms" x="0" y="0" width="280" height="157" />
      <rect className="hall" x="1" y={floor === 1 ? 84 : floor === 2 ? 65 : 77}
        width="278" height={floor === 1 ? 32 : 34} />
      <path className="walls" d={plan.walls} />
      {fire && <circle cx={fire.x} cy={fire.y} r={radius} fill={`url(#${gradient})`} />}
      <g className="map-labels">
        {plan.labels.map(([x, y, label]) => <text key={label} x={x} y={y}>{label}</text>)}
      </g>
      {route.length > 1 && <g className="route-line">
        <polyline className="route-outline" points={routePoints} />
        <polyline className="route-path" points={routePoints} />
        {route.slice(1).map(node =>
          <circle key={node.id} className="route-node" cx={node.x} cy={node.y} r="3.5" />)}
      </g>}
      {start && <circle className="location-dot" cx={start.x} cy={start.y} r="5" />}
      {fire && <g className="fire-marker" transform={`translate(${fire.x - 9} ${fire.y - 10})`}>
        <title>Simulated fire source</title>
        <path d="M10 1c1 5-3 6-2 10 2-1 3-3 3-5 3 3 6 5 6 9a8 8 0 0 1-16 0c0-4 3-7 5-9-1 3 0 4 1 4-1-4 1-6 3-9Z" />
        <path className="fire-marker-core" d="M9 12c0 2-3 3-3 5a3 3 0 0 0 6 0c0-2-2-3-3-5Z" />
      </g>}
    </svg>
  );
}
