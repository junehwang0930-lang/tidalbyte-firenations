import { useEffect, useRef, useState } from 'react';
import './atlas-route.css';

type Room = { id: string; label: string };
type Leg = { level: number; points: [number, number][] };
type Route = {
  status: 'ok' | 'no_route';
  reason: string;
  stair: string | null;
  exitName: string | null;
  assumedLanding: boolean;
  legs: Leg[];
  firePolygon: [number, number][];
  forecast: {elapsed: number; horizon: number; cellSize: number; smoke: string; heat: string} | null;
};
type Catalog = { rooms: Room[]; defaultRoom: string };

export default function App() {
  const [level, setLevel] = useState<1 | 2>(2);
  const [failed, setFailed] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [origin, setOrigin] = useState('');
  const [fire, setFire] = useState('');
  const [route, setRoute] = useState<Route | null>(null);
  const [routeError, setRouteError] = useState('');
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  const ignition = useRef<number | null>(null);
  const defaultOrigin = useRef('');
  const [resetVersion, setResetVersion] = useState(0);

  useEffect(() => {
    let active = true;
    fetch('/api/floor-atlas/scenario/catalog')
      .then(response => { if (!response.ok) throw new Error('Could not load rooms.'); return response.json() as Promise<Catalog>; })
      .then(catalog => {
        if (!active) return;
        setRooms(catalog.rooms);
        defaultOrigin.current = catalog.defaultRoom;
        setOrigin(catalog.defaultRoom);
      })
      .catch(() => { if (active) setRouteError('Room list unavailable. Retry by reloading this page.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!origin) return;
    let timer: number | undefined;
    let controller: AbortController | undefined;
    const started = ignition.current;
    function recalculate() {
      window.clearTimeout(timer);
      controller?.abort();
      controller = new AbortController();
      const id = ++requestId.current;
      const age = started === null ? 0 : Math.max(0, Date.now() - started);
      const query = new URLSearchParams({ origin });
      if (fire) {
        query.set('fire', fire);
        query.set('elapsed', String(Math.floor(age / 1000)));
        // Schedule against ignition, never against request completion or origin change.
        if (age < 86400000) timer = window.setTimeout(recalculate, 20000 - age % 20000);
      }
      setRoute(null);
      setRouteError('');
      setLoading(true);
      fetch(`/api/floor-atlas/scenario/route?${query}`, {
        signal: controller.signal, cache: 'no-store',
      })
        .then(response => { if (!response.ok) throw new Error('Route request failed.'); return response.json() as Promise<Route>; })
        .then(result => { if (requestId.current === id) setRoute(result); })
        .catch(() => { if (requestId.current === id) setRouteError('Route unavailable. No guidance is shown.'); })
        .finally(() => { if (requestId.current === id) setLoading(false); });
    }
    const resume = () => { if (fire && document.visibilityState === 'visible') recalculate(); };
    recalculate();
    document.addEventListener('visibilitychange', resume);
    return () => {
      requestId.current++; controller?.abort(); window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [origin, fire, resetVersion]);

  function resetSimulation() {
    ++requestId.current;
    ignition.current = null;
    setFire(''); setOrigin(defaultOrigin.current); setLevel(2); setEnlarged(false);
    setFailed(false); setRoute(null); setRouteError(''); setResetVersion(v => v + 1);
  }

  const routePoints = (leg: Leg) => leg.points.map(point => point.join(',')).join(' ');
  const activeRoute = route?.status === 'ok';
  return (
    <main className="atlas">
      <header className="atlas-header">
        <div><span>Wayfind / Map review</span><h1>Memorial Student Center</h1></div>
        <nav aria-label="Floor">
          {([2, 1] as const).map(id => <button key={id} aria-pressed={level === id}
            onClick={() => { setLevel(id); setFailed(false); setEnlarged(false); }}>{`Level ${id}`}</button>)}
        </nav>
      </header>
      <section className="atlas-simulation" aria-label="Route simulation controls">
        <strong>SIMULATION ONLY — not for emergency navigation.</strong>
        <label>Selected start
          <select value={origin} onChange={event => setOrigin(event.target.value)} disabled={!rooms.length}>
            {rooms.map(room => <option key={room.id} value={room.id}>{room.label}</option>)}
          </select>
        </label>
        <label>Simulated ignition · Level 2
          <select value={fire} onChange={event => {
            ignition.current = event.target.value ? Date.now() : null;
            setFire(event.target.value);
          }}>
            <option value="">Clear (no fire)</option>
            {rooms.map(room => <option key={room.id} value={room.id}>{room.label}</option>)}
          </select>
        </label>
        <button type="button" onClick={resetSimulation} disabled={!rooms.length}>Reset simulation</button>
      </section>
      <figure>
        <figcaption><h2>Level {level}</h2><span>Whole-floor schematic</span>
          <button aria-pressed={enlarged} onClick={() => setEnlarged(!enlarged)}>{enlarged ? 'Fit floor' : 'Enlarge'}</button></figcaption>
        {failed ? <p role="alert">This local drawing is unavailable. Check that the private map server is running.
          {' '}<button onClick={() => setFailed(false)}>Retry</button></p> :
          <div className={`atlas-paper${enlarged ? ' enlarged' : ''}`} tabIndex={0} aria-label="Floor drawing; scroll horizontally when enlarged">
            <div className="atlas-drawing">
              <img key={level} src={`/api/floor-atlas/${level}`} alt={level === 2
                ? 'Level 2: Bethancourt Ballroom with its five sections, prefunction lobby, West Wing, main meeting rooms and galleries.'
                : 'Level 1: Forster Courtyard, Honor Entrance, meeting rooms, food court, Flag Room, galleries and bookstore.'}
                onError={() => setFailed(true)} />
              {route && <svg className="atlas-overlay" viewBox="0 0 1240 740" aria-hidden="true">
                <defs><marker id="exit-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="14" markerHeight="14"
                  markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 10 5 0 10 2 5Z" fill="#075eae" /></marker></defs>
                {level === 2 && route.forecast && <g fill="none" strokeWidth={route.forecast.cellSize}>
                  <path d={route.forecast.smoke} stroke="#ce9d34" opacity=".46" />
                  <path d={route.forecast.heat} stroke="#d45b22" opacity=".68" />
                </g>}
                {route.status === 'ok' && route.legs.filter(leg => leg.level === level).map((leg, index) =>
                  <g key={index}>
                    <polyline points={routePoints(leg)} className="atlas-route-leg" markerEnd={leg.level===1 ? 'url(#exit-arrow)' : undefined} />
                    <circle cx={leg.points[0][0]} cy={leg.points[0][1]} r="5" fill="#1164ac" stroke="white" strokeWidth="2" />
                  </g>)}
                {level === 2 && fire && route.firePolygon.length > 0 &&
                  <polygon points={route.firePolygon.map(point => point.join(',')).join(' ')} className="atlas-fire-area" />}
              </svg>}
            </div>
          </div>}
      </figure>
      <section className="atlas-route-status" aria-live="polite">
        {loading && <span>Calculating simulated route…</span>}
        {route?.forecast && <p>Incident +{route.forecast.elapsed}s · {route.forecast.horizon}s forecast · refreshes every 20s.
          {' '}Amber: predicted smoke. Orange: predicted heat. Red: ignition room.
          {' '}Model trained on synthetic grids, not measured MSC conditions.</p>}
        {routeError && <p role="alert">{routeError}</p>}
        {route?.status === 'no_route' && <p><strong>No simulated route.</strong> {route.reason}</p>}
        {activeRoute && <div>
          <p><strong>{level === 2 ? `Descend via stair ${route.stair}.` : `Modeled exit: ${route.exitName}.`}</strong> {level === 2 ? route.reason : `From stair ${route.stair}, the arrow marks the modeled exterior endpoint.`}</p>
          {route.assumedLanding && <p className="atlas-warning">Assumed Level 1 landing is active in this model; it has not been verified.</p>}
          {level === 2 && route.legs.some(leg => leg.level === 1) && <button onClick={() => setLevel(1)}>Continue on Level 1</button>}
        </div>}
      </section>
      <footer><span>Teal jambs: door opening. Treads: stair. A ? after the stair ID means the landing is projected, not verified.</span>
        {level === 1 && <span>Green triangles: public entrance locations, not verified emergency exits. Based on the Level 1 directory and <a href="https://ucenter.tamu.edu/facilities/memorial-student-center/points-of-interest/">Texas A&amp;M’s MSC guide</a>.</span>}
        <span>Matching letters are review IDs, not confirmed connections. Door positions are schematic; directory-only areas lack doorway detail.</span>
        <span>Hatching: courtyard or open below. Stippling: approximate interior.</span>
        <span>For layout review · Not to scale or for emergency navigation</span></footer>
    </main>
  );
}
