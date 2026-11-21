import { useEffect, useRef, useState } from 'react';
import { getGraph } from './api';
import CameraDialog from './components/CameraDialog';
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

  return (
    <main className="dashboard">
      <header className="brand"><span className="brand-icon" aria-hidden="true">◆</span> Fire Nations</header>
      <section className="title">
        <p>FICTIONAL MSC</p>
        <h1>Evacuation map</h1>
      </section>
      <section className="map-card" aria-label="Simulation map">
        <div className="map-label"><strong>Floor 1</strong><span>2D FLOOR PLAN</span></div>
        <button type="button" className="map-trigger" aria-label="Open full-screen floor plan"
          onClick={() => mapDialog.current?.showModal()}>
          {map}<span className="expand" aria-hidden="true">⤢</span>
        </button>
        <div className="legend"><span className="heat-ramp" aria-hidden="true" />
          <span>High → low simulated fire intensity</span></div>
      </section>
      <section className="route-status" aria-label="Demo route">
        <span className="route-icon" aria-hidden="true">↱</span>
        <div><small>SIMULATED ROUTE</small><strong>{direction || 'No demo route available'}</strong></div>
        <span className="snapshot">Snapshot {snapshot + 1}</span>
      </section>
      <div className="actions">
        <button type="button" onClick={() => setCamera(true)}><span aria-hidden="true">◉</span>Camera AR view</button>
        <button type="button" onClick={refreshRoute}><span aria-hidden="true">↻</span>Refresh route</button>
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
      {camera && <CameraDialog onClose={() => setCamera(false)} direction={direction} />}
    </main>
  );
}
