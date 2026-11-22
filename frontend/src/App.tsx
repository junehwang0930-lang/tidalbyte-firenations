import { useRef, useState } from 'react';
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
  const [camera, setCamera] = useState(false);
  const [cameraExpanded, setCameraExpanded] = useState(false);
  const cameraButton = useRef<HTMLButtonElement>(null);
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
      {atlas.catalog && <details className="atlas-simulation">
        <summary className="simulation-toggle">
          <span className="simulation-icon" aria-hidden="true">
            <svg className="icon" viewBox="0 0 24 24"><path d="M9 3h6m-5 0v7l-5 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-8V3M8 15h8" /></svg>
          </span>
          <span className="simulation-label"><strong>Simulation</strong>
            <small>{atlas.fire ? atlas.catalog.rooms.find(room => room.id === atlas.fire)?.label : 'No fire selected'}</small>
          </span>
          <svg className="icon simulation-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
        </summary>
        <div className="simulation-fields">
          <RoomSelect label="Start on Level 2" value={atlas.origin} options={atlas.catalog.rooms} onChange={atlas.selectOrigin} />
          <RoomSelect label="Simulated ignition" value={atlas.fire}
            options={[{ id: '', label: 'Clear (no fire)' }, ...atlas.catalog.rooms]} onChange={atlas.selectFire} />
          <button type="button" className="simulation-reset" onClick={() => { atlas.reset(); selectFloor(2); }}>Reset simulation</button>
        </div>
      </details>}
      <section className="route-card" aria-label="Directions" data-ok={floorHasScenario && hasRoute}>
        <span className="route-icon" aria-hidden="true">
          <svg className="icon" viewBox="0 0 24 24"><path d="M5 20v-9a3 3 0 0 1 3-3h11m-4-4 4 4-4 4" /></svg>
        </span>
        <div><small>Directions</small><strong role="status">{routeStatus}</strong></div>
      </section>
      <section className="map-card" aria-label="Simulation map">
        <div className="map-label">{floorPicker}{camera && <button className="pill" type="button" onClick={atlas.refresh}>
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4v6h-6m6 0a8 8 0 1 0 0 5" /></svg>
          <span className="sr-only">Refresh route</span></button>}</div>
        <button type="button" className="map-trigger" aria-label="Open full-screen floor plan"
          onClick={() => mapDialog.current?.showModal()}>
          {renderMap(setMapLoaded)}<svg className="expand icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 4h6v6M20 4l-6 6M10 20H4v-6m0 6 6-6" />
          </svg>
        </button>
      </section>
      <div className="actions">
        <button ref={cameraButton} className="primary" type="button" onClick={() => setCamera(true)}><svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 7h4l2-3h6l2 3h4v13H3z" /><circle cx="12" cy="13" r="3" />
        </svg>Open AR camera</button>
        <button className="secondary" type="button" onClick={atlas.refresh}><svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 4v6h-6m6 0a8 8 0 1 0 0 5" />
        </svg>Refresh route</button>
      </div>
      <footer><strong>Simulation only.</strong> Not a validated safety system. Follow official alarms and emergency personnel.</footer>
      <dialog className="overlay fullscreen" ref={mapDialog} aria-labelledby="map-title">
        <header className="dialog-header"><h2 id="map-title" className="sr-only">Full-screen floor plan</h2>{floorPicker}
          <button className="pill map-close" type="button" aria-label="Close full-screen floor plan"
            onClick={() => mapDialog.current?.close()}>
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <div className="full-map">{renderMap()}</div>
        <footer>Simulation only · Fictional floor plan</footer>
      </dialog>
      {camera && <CameraPanel onClose={closeCamera} route={floorHasScenario && hasRoute ? route : []} edges={[]} floor={floor} endpointLabel={floor === 2 ? `Stair ${atlas.route?.stair ?? ""}` : atlas.route?.exitName ?? "Modeled exit"}
        expanded={cameraExpanded} onExpand={setCameraExpanded} />}
    </main>
  );
}
