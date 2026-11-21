import { useEffect, useState } from 'react';
import { getGraph, getHealth } from './api';
import type { BuildingGraph } from './types';

export default function App() {
  const [graph, setGraph] = useState<BuildingGraph | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getHealth(controller.signal), getGraph(controller.signal)])
      .then(([, building]) => setGraph(building))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Cannot reach the backend.');
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <main>
      <h1>Fire Nations</h1>
      <p className="disclaimer"><strong>Simulation only.</strong> Fictional layout; not for real emergency navigation.
        Official alarms and emergency personnel supersede any prototype suggestion.</p>
      <h2>Shared project connection check</h2>
      {error ? <p role="alert">{error} Start the backend and reload this page.</p> :
        graph ? <p role="status">Backend connected. Fictional graph loaded: {graph.nodes.length} nodes,
          {' '}{graph.edges.length} connections, {graph.exitNodeIds.length} demo exits.</p> :
          <p role="status">Connecting to the backend…</p>}
      <p>The map interface, hazard simulation, and pathfinding are reserved for their feature branches.</p>
    </main>
  );
}
