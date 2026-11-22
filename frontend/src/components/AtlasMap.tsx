import { useId, useState } from 'react';
import type { AtlasRoute } from '../useAtlas';
import levelOne from '../../../data/floor-atlas/level-1.svg?url';
import levelTwo from '../../../data/floor-atlas/level-2.svg?url';

import type { MapFix } from '../positioning';

export default function AtlasMap({ mapFix, floor, route, offline, onAvailability }: {
  mapFix: MapFix | null; floor: number; route: AtlasRoute | null; offline: boolean; onAvailability?: (available: boolean) => void;
}) {
  const marker = useId();
  const [image, setImage] = useState<'loading' | 'ready' | 'failed'>('loading');
  return <div className="atlas-drawing">
    {image === 'failed' && <p role="alert">This floor drawing is unavailable. No route guidance is shown.</p>}
    <img src={offline ? (floor === 1 ? levelOne : levelTwo) : `/api/floor-atlas/${floor}`}
      alt={`Level ${floor} atlas drawing; unverified training layout`}
      hidden={image === 'failed'} onLoad={() => { setImage('ready'); onAvailability?.(true); }}
      onError={() => { setImage('failed'); onAvailability?.(false); }} />
    {image === 'ready' && route && <svg className="atlas-overlay" viewBox="0 0 1240 740" aria-hidden="true">
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
    {image === 'ready' && mapFix?.floor === floor && <svg className="atlas-overlay" viewBox="0 0 1240 740" aria-label="Estimated device location">
      <circle cx={mapFix.x} cy={mapFix.y} r={mapFix.radius} fill="var(--accent)" opacity=".18" />
      <circle className="location-dot" cx={mapFix.x} cy={mapFix.y} r="5" />
    </svg>}
  </div>;
}
