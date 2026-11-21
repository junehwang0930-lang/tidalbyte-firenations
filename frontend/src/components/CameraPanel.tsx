import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

export default function CameraPanel({ onClose, direction, expanded, onExpand }: {
  onClose: () => void;
  direction: string;
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
}) {
  const handle = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ id: number; y: number } | null>(null);
  const didSwipe = useRef(false);
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('Camera is off');
  const [active, setActive] = useState(false);

  useEffect(() => { handle.current?.focus(); }, []);

  useEffect(() => {
    if (!active) return;
    let closed = false;
    let stream: MediaStream | undefined;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Live camera requires a secure browser connection.');
        }
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false, video: { facingMode: { ideal: 'environment' } },
        });
        if (closed) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        if (video.current) video.current.srcObject = stream;
        setStatus('');
      } catch (error) {
        if (closed) return;
        setActive(false);
        setStatus(error instanceof Error && error.name === 'NotAllowedError'
          ? 'Camera permission was denied. Demo overlay is still available.'
          : 'Camera unavailable. Demo overlay is still available.');
      }
    }
    void start();
    return () => {
      closed = true;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [active]);

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

  return (
    <section className="camera-panel" aria-labelledby="camera-title"
      onPointerDown={startSwipe} onPointerUp={finishSwipe}
      onPointerCancel={() => { drag.current = null; }}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          if (expanded) onExpand(false);
          else onClose();
        }
      }}>
      <div className="camera-frame" data-live={!status}>
        <video ref={video} autoPlay playsInline muted />
        <div className="camera-scene" aria-hidden="true">
          <div className="camera-corridor" />
        </div>
        <button ref={handle} type="button" className="camera-handle" aria-expanded={expanded}
          aria-label={expanded ? 'Return to split view' : 'Expand camera to full screen'}
          onClick={event => {
            if (event.detail === 0 || !didSwipe.current) onExpand(!expanded);
            didSwipe.current = false;
          }}><span aria-hidden="true" /></button>
        <header className="camera-header">
          <div className="camera-instruction">
            <h2 id="camera-title" className="sr-only">Camera AR view</h2>
            <strong>{direction || 'Route unavailable'}</strong>
          </div>
          <button className="close glass-control" type="button" aria-label="Close camera" onClick={onClose}>×</button>
        </header>
        {direction && <div className="camera-guide" aria-hidden="true">
          <div className={direction === 'West exit' ? 'camera-lane camera-lane-west' : 'camera-lane'}>
            <span /><span /><span />
          </div>
        </div>}
        <div className="camera-dock">
          <p className="camera-note">Simulation only · Device heading is untracked</p>
          {status && <p role="status" className="camera-status">{status}</p>}
          {!active && <button className="glass-control" type="button" onClick={() => {
            setStatus('Requesting camera…');
            setActive(true);
          }}>{status === 'Camera is off' ? 'Enable camera' : 'Retry camera'}</button>}
        </div>
      </div>
    </section>
  );
}
