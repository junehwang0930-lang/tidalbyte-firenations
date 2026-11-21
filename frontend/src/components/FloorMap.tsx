import { useId } from 'react';
import type { GraphNode } from '../types';

export default function FloorMap({ route, radius, fire }: {
  route: GraphNode[];
  radius: number;
  fire?: GraphNode;
}) {
  const gradient = useId();
  const start = route[0];
  return (
    <svg className="floor-map" viewBox="-24 -24 328 205" role="img"
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
        <text x="40" y="23">ROOM A</text><text x="140" y="23">ROOM B</text>
        <text x="234" y="42">COMMONS</text><text x="129" y="139">LOBBY</text>
        <text x="0" y="171">WEST EXIT</text><text x="280" y="171">EAST EXIT</text>
      </g>
      {route.length > 1 && <polyline className="route-line" points={route.map(n => `${n.x},${n.y}`).join(' ')} />}
      {start && <circle className="location-dot" cx={start.x} cy={start.y} r="5" />}
      {fire && <circle className="fire-dot" cx={fire.x} cy={fire.y} r="4" />}
    </svg>
  );
}
