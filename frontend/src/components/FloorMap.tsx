import { useId } from 'react';
import type { GraphNode } from '../types';

export default function FloorMap({ route, radius, fire }: {
  route: GraphNode[];
  radius: number;
  fire?: GraphNode;
}) {
  const gradient = useId();
  const start = route[0];
  const routePoints = route.map(node => `${node.x},${node.y}`).join(' ');
  return (
    <svg className="floor-map" viewBox="-18 -22 316 202" role="img"
      aria-label="Fictional first-floor plan with simulated fire spread and sample route">
      <defs>
        <radialGradient id={gradient}>
          <stop stopColor="#ff344c" stopOpacity=".94" />
          <stop offset=".37" stopColor="#ff543f" stopOpacity=".78" />
          <stop offset=".67" stopColor="#ffd34b" stopOpacity=".58" />
          <stop offset=".91" stopColor="#88ea86" stopOpacity=".44" />
          <stop offset="1" stopColor="#88ea86" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path className="rooms" d="M0 0H280V157H0V116H-10V84H0Z" />
      <path className="hall" d="M0 84H280V116H0ZM29 65H51V84H29ZM129 65H151V84H129Z" />
      <path className="walls" d="M0 84H29V65H51V84H129V65H151V84H280M0 116H280M90 0V84M188 0V84M67 116V157M190 116V157" />
      {fire && <circle cx={fire.x} cy={fire.y} r={radius} fill={`url(#${gradient})`} />}
      <g className="map-labels">
        <text x="40" y="23">Room A</text><text x="140" y="23">Room B</text>
        <text x="234" y="42">Commons</text><text x="129" y="139">Lobby</text>
        <text x="0" y="171">West exit</text><text x="280" y="171">East exit</text>
      </g>
      {route.length > 1 && <g className="route-line">
        <polyline className="route-outline" points={routePoints} />
        <polyline className="route-path" points={routePoints} />
      </g>}
      {start && <circle className="location-dot" cx={start.x} cy={start.y} r="5" />}
      {fire && <circle className="fire-dot" cx={fire.x} cy={fire.y} r="4" />}
    </svg>
  );
}
