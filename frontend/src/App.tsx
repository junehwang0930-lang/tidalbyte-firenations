import { useEffect, useRef, useState } from 'react';
import { useAtlas } from './useAtlas';
import AtlasMap from './components/AtlasMap';
import RoomSelect from './components/RoomSelect';
import './atlas-route.css';
import CameraPanel from './components/CameraPanel';
import FloorSelect from './components/FloorSelect';
import FloorMap, { floors } from './components/FloorMap';
import type { Floor } from './components/FloorMap';
import type { GraphNode } from './types';

export default function App() {
  const atlas = useAtlas();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [floor, setFloor] = useState<Floor>(2);
  const [snapshot, setSnapshot] = useState(0);
  const [camera, setCamera] = useState(false);
  const [cameraExpanded, setCameraExpanded] = useState(false);
  const cameraButton = useRef<HTMLButtonElement>(null);
  const [announcement, setAnnouncement] = useState('');
  const mapDialog = useRef<HTMLDialogElement>(null);
  const floorHasScenario = !!atlas.catalog && (floor === 1 || floor === 2);
  const leg = atlas.route?.status === 'ok' ? atlas.route.legs.find(item => item.level === floor) : undefined;
  const route: GraphNode[] = mapLoaded && leg ? leg.points.map(([x, y], i) => ({
    id: `atlas-${floor}-${i}`, areaId: 'atlas', x, y, floor, kind: 'corridor',
  })) : [];
  const hasRoute = route.length > 1;
  const routeStatus = atlas.loading ? 'Calculating simulated route…' : atlas.error ||
    (atlas.route?.status === 'no_route' ? 'No simulated route available' :
      hasRoute ? (floor === 2 ? `Via stair ${atlas.route?.stair}` : atlas.route?.exitName ?? 'Modeled exit') :
        floorHasScenario ? 'No route on this floor' : 'Training map unavailable');
  function selectFloor(value: Floor) {
    if (value === floor) return;
    setMapLoaded(false);
    setFloor(value);
  }
  const renderMap = (onAvailability?: (available: boolean) => void) => floorHasScenario
    ? <AtlasMap key={floor} floor={floor} route={atlas.route} offline={atlas.offline}
        onAvailability={onAvailability} />
    : <FloorMap floor={floor} route={[]} radius={0} fire={undefined} />;
  const floorPicker = <FloorSelect floors={floors} value={floor} onChange={selectFloor} />;
  const legend = floorHasScenario
    ? 'Amber: predicted smoke · Orange: predicted heat · Red: ignition'
    : 'Fictional preview only · No atlas routing on this floor';

  useEffect(() => { if (atlas.error) setAnnouncement(atlas.error); }, [atlas.error]);
  function refreshRoute() {
    atlas.refresh(); setSnapshot(value => value + 1);
    setAnnouncement('Recomputing route from the current simulated incident.');
  }

  function closeCamera() {
    setCamera(false);
    setCameraExpanded(false);
    requestAnimationFrame(() => cameraButton.current?.focus());
  }

  return (
    <main className={camera ? `dashboard camera-layout${cameraExpanded ? ' camera-layout-expanded' : ''}` : 'dashboard'}>
      <header className="title">
        <p>Fire Nations · Fictional MSC</p>
        <h1>Evacuation</h1>
      </header>
      <section className="route-card" aria-label="Demo route" data-ok={floorHasScenario && hasRoute}>
        <span className="route-icon" aria-hidden="true">
          <svg className="icon" viewBox="0 0 24 24"><path d="M5 20v-9a3 3 0 0 1 3-3h11m-4-4 4 4-4 4" /></svg>
        </span>
        <div><small>Simulated route</small><strong>{routeStatus}</strong></div>
      </section>
      {atlas.catalog && <section className="atlas-simulation" aria-label="Simulation controls">
        <RoomSelect label="Start on Level 2" value={atlas.origin} options={atlas.catalog.rooms} onChange={atlas.selectOrigin} />
        <RoomSelect label="Simulated ignition" value={atlas.fire}
          options={[{ id: '', label: 'Clear (no fire)' }, ...atlas.catalog.rooms]} onChange={atlas.selectFire} />
        <button type="button" onClick={() => { atlas.reset(); selectFloor(2); }}>Reset simulation</button>
        {atlas.route?.forecast && <p>Incident +{atlas.route.forecast.elapsed}s · {atlas.route.forecast.horizon}s forecast · recomputes every 20s.</p>}
        {atlas.route && <p>{atlas.route.reason}</p>}
        {atlas.route?.assumedLanding && <p>Landing is assumed and unverified.</p>}
      </section>}
      <section className="map-card" aria-label="Simulation map">
        <div className="map-label">{floorPicker}{camera && <button className="pill" type="button" onClick={refreshRoute}>
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4v6h-6m6 0a8 8 0 1 0 0 5" /></svg>
          <span className="sr-only">Refresh route</span></button>}</div>
        <button type="button" className="map-trigger" aria-label="Open full-screen floor plan"
          onClick={() => mapDialog.current?.showModal()}>
          {renderMap(setMapLoaded)}<svg className="expand icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 4h6v6M20 4l-6 6M10 20H4v-6m0 6 6-6" />
          </svg>
        </button>
        <div className="legend">{legend}</div>
      </section>
      <div className="actions">
        <button ref={cameraButton} className="primary" type="button" onClick={() => setCamera(true)}><svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 7h4l2-3h6l2 3h4v13H3z" /><circle cx="12" cy="13" r="3" />
        </svg>Open AR camera</button>
        <button className="secondary" type="button" onClick={refreshRoute}><svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 4v6h-6m6 0a8 8 0 1 0 0 5" />
        </svg>Refresh route<span className="snapshot">#{snapshot + 1}</span></button>
      </div>
      <p className="sr-only" role="status">{announcement} {routeStatus}</p>
      <footer><strong>Simulation only.</strong> Not a validated safety system. Follow official alarms and emergency personnel.</footer>
      <dialog className="overlay fullscreen" ref={mapDialog} aria-labelledby="map-title">
        <header className="dialog-header"><h2 id="map-title" className="sr-only">Full-screen floor plan</h2>{floorPicker}
          <button className="pill" type="button" onClick={() => mapDialog.current?.close()}>Done</button>
        </header>
        <div className="full-map">{renderMap()}</div>
        <div className="legend">{legend}</div>
        <footer>Simulation only · Fictional floor plan</footer>
      </dialog>
      {camera && <CameraPanel onClose={closeCamera} route={floorHasScenario && hasRoute ? route : []} edges={[]} floor={floor} endpointLabel={floor === 2 ? `Stair ${atlas.route?.stair ?? ""}` : atlas.route?.exitName ?? "Modeled exit"}
        expanded={cameraExpanded} onExpand={setCameraExpanded} />}
    </main>
  );
}
