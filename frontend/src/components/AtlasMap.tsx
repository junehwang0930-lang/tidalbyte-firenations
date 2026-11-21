import { useEffect, useId, useState } from 'react';
import type { AtlasRoute } from '../useAtlas';

export default function AtlasMap({ floor, route, onAvailability }: {
  floor: number; route: AtlasRoute | null; onAvailability: (available: boolean) => void;
}) {
  const marker = useId();
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); onAvailability(false); }, [floor, onAvailability]);
  return <div className="atlas-drawing">
    {failed && <p role="alert">This floor drawing is unavailable. No route guidance is shown.</p>}
    <img key={floor} src={`/api/floor-atlas/${floor}`} alt={`Level ${floor} atlas drawing; unverified training layout`}
      hidden={failed} onLoad={() => onAvailability(true)} onError={() => { setFailed(true); onAvailability(false); }} />
    {!failed && route && <svg className="atlas-overlay" viewBox="0 0 1240 740" aria-hidden="true">
      <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="14" markerHeight="14"
        markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 10 5 0 10 2 5Z" fill="var(--accent)" /></marker></defs>
      {floor === 2 && route.forecast && <g fill="none" strokeWidth={route.forecast.cellSize}>
        <path d={route.forecast.smoke} stroke="#ce9d34" opacity=".46" />
        <path d={route.forecast.heat} stroke="#d45b22" opacity=".68" />
      </g>}
      {route.status === 'ok' && route.legs.filter(leg => leg.level === floor).map((leg, i) =>
        <polyline key={i} points={leg.points.map(p => p.join(',')).join(' ')} className="atlas-route-leg"
          markerEnd={floor === 1 ? `url(#${marker})` : undefined} />)}
      {floor === 2 && route.firePolygon.length > 0 &&
        <polygon points={route.firePolygon.map(p => p.join(',')).join(' ')} className="atlas-fire-area" />}
    </svg>}
  </div>;
}
