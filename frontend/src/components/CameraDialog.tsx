import { useEffect, useRef, useState } from 'react';

export default function CameraDialog({ onClose, direction }: {
  onClose: () => void;
  direction: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState('Camera is off');
  const [active, setActive] = useState(false);

  useEffect(() => { dialog.current?.showModal(); }, []);

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
        if (!closed) setStatus(error instanceof Error && error.name === 'NotAllowedError'
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

  return (
    <dialog ref={dialog} className={expanded ? 'overlay fullscreen camera-dialog' : 'overlay camera-dialog'}
      onCancel={onClose} aria-labelledby="camera-title">
      <div className="camera-frame" data-live={!status}>
        <video ref={video} autoPlay playsInline muted />
        <div className="camera-scene" aria-hidden="true">
          <div className="camera-corridor" />
        </div>
        <header className="camera-header">
          <div className="camera-instruction">
            <span>Simulated guidance</span>
            <h2 id="camera-title">Camera AR view</h2>
            <strong>{direction || 'Route unavailable'}</strong>
          </div>
          <button className="close" type="button" aria-label="Close camera" onClick={onClose}>×</button>
        </header>
        {direction && <div className="camera-guide" aria-hidden="true">
          <div className={direction === 'West exit' ? 'camera-lane camera-lane-west' : 'camera-lane'}>
            <span /><span /><span />
          </div>
        </div>}
        <div className="camera-dock">
          <p className="camera-note">Simulation only · Device heading is untracked</p>
          {status && <p role="status" className="camera-status">{status}</p>}
          <div className="dialog-actions">
            {!active && <button type="button" onClick={() => {
              setStatus('Requesting camera…');
              setActive(true);
            }}>Enable camera</button>}
            <button type="button" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Return to preview' : 'Full screen'}
            </button>
            <button type="button" onClick={onClose}>Dismiss</button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
