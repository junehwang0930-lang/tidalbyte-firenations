import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { GraphEdge, GraphNode } from '../types';

type Turn = 'left' | 'right' | 'straight';
type CameraState = 'starting' | 'live' | 'denied' | 'unavailable';

const placeNames: Record<string, string> = {
  'room-a': 'Room A', 'room-b': 'Room B', junction: 'the main hallway',
  'hall-west': 'the west hallway', 'hall-east': 'the east hallway',
  'exit-west': 'West exit', 'exit-east': 'East exit',
};

function edgeLength(edges: GraphEdge[], a: GraphNode, b: GraphNode) {
  const edge = edges.find(e => (e.from === a.id && e.to === b.id) || (e.bidirectional && e.from === b.id && e.to === a.id));
  return edge?.distance ?? Math.hypot(b.x - a.x, b.y - a.y);
}

/** Turns the demo route into a single "what to do next" instruction. Map y grows downward. */
export function describeRoute(route: GraphNode[], edges: GraphEdge[]) {
  if (route.length < 2) return null;
  const exit = route[route.length - 1];
  const start = route[0];
  let walk = edgeLength(edges, route[0], route[1]);
  for (let i = 1; i < route.length - 1; i++) {
    const [a, b, c] = [route[i - 1], route[i], route[i + 1]];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) > 1e-6) {
      const turn: Turn = cross > 0 ? 'right' : 'left';
      return { exit, start, turn, distance: walk, toward: placeNames[c.id] ?? 'the hallway' };
    }
    walk += edgeLength(edges, b, c);
  }
  return { exit, start, turn: 'straight' as Turn, distance: walk, toward: placeNames[exit.id] ?? 'the exit' };
}

export default function CameraPanel({ onClose, route, edges, expanded, onExpand, floor = 1, endpointLabel }: {
  floor?: number;
  endpointLabel?: string;
  onClose: () => void;
  route: GraphNode[];
  edges: GraphEdge[];
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
}) {
  const handle = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ id: number; y: number } | null>(null);
  const didSwipe = useRef(false);
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>('starting');
  const [attempt, setAttempt] = useState(0);
  const step = describeRoute(route, edges);
  const exitName = step ? endpointLabel ?? placeNames[step.exit.id] ?? 'Exit' : '';

  useEffect(() => { handle.current?.focus(); }, []);

  // The camera starts as soon as the AR view opens; no extra tap needed.
  useEffect(() => {
    const preview = video.current;
    if (!preview) return;
    let closed = false;
    let stream: MediaStream | undefined;
    function releaseStream() {
      if (!stream) return;
      if (preview?.srcObject === stream) preview.srcObject = null;
      stream.getTracks().forEach(track => track.stop());
      stream = undefined;
    }
    setState('starting');
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('insecure');
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false, video: { facingMode: { ideal: 'environment' } },
        });
        if (closed) return releaseStream();
        preview.srcObject = stream;
        await preview.play();
        if (!closed) setState('live');
      } catch (error) {
        if (closed) return;
        const permissionDenied = !stream && error instanceof Error && error.name === 'NotAllowedError';
        releaseStream();
        setState(permissionDenied ? 'denied' : 'unavailable');
      }
    })();
    return () => {
      closed = true;
      releaseStream();
    };
  }, [attempt]);

  function startSwipe(event: PointerEvent<HTMLElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button') && !handle.current?.contains(target)) return;
    didSwipe.current = false;
    drag.current = { id: event.pointerId, y: event.clientY };
    target.setPointerCapture?.(event.pointerId);
  }

  function finishSwipe(event: PointerEvent<HTMLElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    drag.current = null;
    const delta = event.clientY - start.y;
    if (Math.abs(delta) < 42) return;
    didSwipe.current = true;
    onExpand(delta < 0);
  }

  const turnGlyph = step?.turn === 'left' ? '↰' : step?.turn === 'right' ? '↱' : '↑';
  const failed = state === 'denied' || state === 'unavailable';

  return (
    <section className="ar" aria-labelledby="ar-title"
      onPointerDown={startSwipe} onPointerUp={finishSwipe}
      onPointerCancel={() => { drag.current = null; }}
      onKeyDown={event => {
        if (event.key === 'Escape') expanded ? onExpand(false) : onClose();
      }}>
      <h2 id="ar-title" className="sr-only">Camera AR view</h2>
      <video ref={video} className="ar-video" data-live={state === 'live'} autoPlay playsInline muted />
      {state !== 'live' && <div className="ar-fallback" aria-hidden="true"><div className="ar-floor" /></div>}

      {step && <div className="ar-world" aria-hidden="true">
        <p className="ar-sign">{exitName}</p>
        <svg className="ar-ground" viewBox="0 0 100 160">
          <defs>
            <linearGradient id="ar-path-fill" gradientUnits="userSpaceOnUse" x1="0" y1="160" x2="0" y2="20">
              <stop offset="0" stopColor="var(--ar-path)" stopOpacity=".9" />
              <stop offset=".75" stopColor="var(--ar-path)" stopOpacity=".6" />
              <stop offset="1" stopColor="var(--ar-path)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="ar-ribbon" stroke="url(#ar-path-fill)" d={step.turn === 'left'
            ? 'M50 280 V44 Q50 22 28 22 H-60'
            : step.turn === 'right' ? 'M50 280 V44 Q50 22 72 22 H160' : 'M50 280 V0'} />
          <g transform="translate(50 82) scale(1.25)">
            <path className="ar-arrow-side" d="M0 -22 20 0 9 0 9 20 -9 20 -9 0 -20 0Z" transform="translate(0 4)" />
            <path className="ar-arrow-face" d="M0 -22 20 0 9 0 9 20 -9 20 -9 0 -20 0Z" />
          </g>
        </svg>
      </div>}

      <div className="ar-top">
        <button type="button" className="ar-round" aria-label={expanded ? 'Show map and camera' : 'Full-screen camera'}
          onClick={() => onExpand(!expanded)}>
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
            {expanded ? <path d="M9 4v5H4m11-5v5h5M9 20v-5H4m11 5v-5h5" />
              : <path d="M4 9V4h5m6 0h5v5M4 15v5h5m11-5v5h-5" />}
          </svg>
        </button>
        <button ref={handle} type="button" className="ar-handle" aria-expanded={expanded}
          aria-label={expanded ? 'Return to split view' : 'Expand camera to full screen'}
          onClick={event => {
            if (event.detail === 0 || !didSwipe.current) onExpand(!expanded);
            didSwipe.current = false;
          }}><span aria-hidden="true" /></button>
        <button type="button" className="ar-round" aria-label="Close camera" onClick={onClose}>
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>

      <div className="ar-bottom">
        {state === 'starting' && <p className="ar-status" role="status">Starting camera…</p>}
        {failed && <div className="ar-status-row" role="status">
          <p className="ar-status">{state === 'denied'
            ? 'Camera blocked. Allow it in Settings.'
            : 'Camera unavailable.'}</p>
          <button type="button" className="ar-retry" onClick={() => setAttempt(attempt + 1)}>Try again</button>
        </div>}
        {step ? <>
          <p className="ar-sub">Leave {placeNames[step.start.id] ?? 'this room'} · Floor {floor}</p>
          <p className="ar-main">
            In {Math.round(step.distance)} demo units <span className="ar-glyph" aria-hidden="true">{turnGlyph}</span>{' '}
            {step.turn === 'straight' ? `Continue to ${step.toward}` : `Turn ${step.turn} into ${step.toward}`}
          </p>
        </> : <p className="ar-main">No simulated route on this floor</p>}
        <p className="ar-note">Simulation only · Follow official alarms and staff</p>
      </div>
    </section>
  );
}
