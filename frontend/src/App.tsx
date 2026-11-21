import { useEffect, useRef, useState } from 'react';
import { getGraph } from './api';
import CameraPanel from './components/CameraPanel';
import FloorMap from './components/FloorMap';
import type { BuildingGraph, GraphNode } from './types';
import demoGraph from '../../data/building.json';

const demoRoutes = [
  ['room-b', 'junction', 'hall-east', 'exit-east'],
  ['room-b', 'junction', 'hall-west', 'exit-west'],
];
const fixture = demoGraph as BuildingGraph;

export default function App() {
  const [graph, setGraph] = useState(fixture);
  const [snapshot, setSnapshot] = useState(0);
  const [camera, setCamera] = useState(false);
  const [cameraExpanded, setCameraExpanded] = useState(false);
  const cameraButton = useRef<HTMLButtonElement>(null);
  const [announcement, setAnnouncement] = useState('');
  const mapDialog = useRef<HTMLDialogElement>(null);
  const phase = snapshot % demoRoutes.length;
  const nodes = new Map(graph.nodes.filter(node => node.floor === 1).map(node => [node.id, node]));
  const routeIds = demoRoutes[phase];
  const route = routeIds.map(id => nodes.get(id)).filter((node): node is GraphNode => !!node);
  const connected = route.length === routeIds.length && route.slice(1).every((node, i) =>
    graph.edges.some(edge => (edge.from === route[i].id && edge.to === node.id) ||
      (edge.bidirectional && edge.to === route[i].id && edge.from === node.id)));
  const hasRoute = connected && graph.exitNodeIds.includes(routeIds[routeIds.length - 1]);
  const direction = hasRoute ? (phase === 0 ? 'East exit' : 'West exit') : '';
  const map = <FloorMap route={hasRoute ? route : []} radius={phase === 0 ? 47 : 72}
    fire={nodes.get(phase === 0 ? 'room-a' : 'hall-east')} />;

  useEffect(() => {
    const controller = new AbortController();
    getGraph(controller.signal).then(setGraph).catch(() => {
      // The shared fictional fixture supports disconnected demos.
    });
    return () => controller.abort();
  }, []);

  function refreshRoute() {
    setSnapshot(snapshot + 1);
    setAnnouncement(`Demo route refreshed for snapshot ${snapshot + 2}.`);
  }

  function closeCamera() {
    setCamera(false);
    setCameraExpanded(false);
    requestAnimationFrame(() => cameraButton.current?.focus());
  }

  return (
    <main className={camera ? `dashboard camera-layout${cameraExpanded ? ' camera-layout-expanded' : ''}` : 'dashboard'}>
      <header className="brand">Fire Nations</header>
      <section className="title">
        <p>Fictional MSC</p>
        <h1>Evacuation map</h1>
      </section>
      <section className="map-card" aria-label="Simulation map">
        <div className="map-label"><strong>Floor 1</strong>{camera ? <button className="glass-control" type="button" onClick={refreshRoute}>Refresh route</button> : <span>Floor plan</span>}</div>
        <button type="button" className="map-trigger" aria-label="Open full-screen floor plan"
          onClick={() => mapDialog.current?.showModal()}>
          {map}<svg className="expand icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 4h6v6M20 4l-6 6M10 20H4v-6m0 6 6-6" />
          </svg>
        </button>
        <div className="legend"><span className="heat-ramp" aria-hidden="true" />
          <span>High → low simulated fire intensity</span></div>
      </section>
      <section className="route-status" aria-label="Demo route">
        <svg className="route-icon icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 20v-9a3 3 0 0 1 3-3h11m-4-4 4 4-4 4" />
        </svg>
        <div><small>Simulated route</small><strong>{direction || 'No demo route available'}</strong></div>
        <span className="snapshot">Snapshot {snapshot + 1}</span>
      </section>
      <div className="actions">
        <button ref={cameraButton} type="button" onClick={() => setCamera(true)}><svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 7h4l2-3h6l2 3h4v13H3z" /><circle cx="12" cy="13" r="3" />
        </svg>Camera AR view</button>
        <button type="button" onClick={refreshRoute}><svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 4v6h-6m6 0a8 8 0 1 0 0 5" />
        </svg>Refresh route</button>
      </div>
      <p className="sr-only" role="status">{announcement} {direction}</p>
      <footer><strong>Simulation only.</strong> Follow official alarms and emergency personnel.</footer>
      <dialog className="overlay fullscreen" ref={mapDialog} aria-labelledby="map-title">
        <header className="dialog-header"><h2 id="map-title">Floor 1</h2>
          <button className="close" type="button" aria-label="Close full-screen map"
            onClick={() => mapDialog.current?.close()}>×</button>
        </header>
        <div className="full-map">{map}</div>
        <div className="legend"><span className="heat-ramp" aria-hidden="true" />High → low simulated fire intensity</div>
        <footer>Simulation only · Fictional floor plan</footer>
      </dialog>
      {camera && <CameraPanel onClose={closeCamera} direction={direction}
        expanded={cameraExpanded} onExpand={setCameraExpanded} />}
    </main>
  );
}
