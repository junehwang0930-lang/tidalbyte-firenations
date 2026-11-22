import { useEffect, useRef, useState } from 'react';
import calibration from '../../../data/floor-atlas/calibration.json';
import type { MapFix } from '../positioning';
import { FloorEstimator, projectFix, relativeFix, smoothHeading } from '../positioning';
import type { SensorFloor } from '../positioning';

export default function LocationPanel({ onFloor, onMapFix }: { onFloor: (floor: SensorFloor) => void; onMapFix: (fix: MapFix | null) => void }) {
  const [enabled, setEnabled] = useState(false);
  const [fix, setFix] = useState<GeolocationPosition | null>(null);
  const [message, setMessage] = useState('');
  const [heading, setHeading] = useState<number | null>(null);
  const [motion, setMotion] = useState('');
  const [anchor, setAnchor] = useState<GeolocationCoordinates | null>(null);
  const [manualFloor, setManualFloor] = useState<SensorFloor>(2);
  const model = useRef(new FloorEstimator());
  const session = useRef(0);
  const callback = useRef(onFloor);
  callback.current = onFloor;

  const estimatedFloor = model.current.floor ?? manualFloor;
  useEffect(() => {
    const point = !fix ? null : calibration[estimatedFloor].length === 3
      ? projectFix(calibration[estimatedFloor], fix.coords.latitude, fix.coords.longitude, fix.coords.accuracy, estimatedFloor)
      : anchor && relativeFix(anchor, fix.coords, estimatedFloor);
    onMapFix(point ? { ...point, heading } : null);
    return () => onMapFix(null);
  }, [anchor, fix, heading, estimatedFloor, onMapFix]);

  function start() {
    if (!window.isSecureContext || !navigator.geolocation) {
      setMessage('Device location requires HTTPS and browser geolocation support.');
      return;
    }
    const id = ++session.current;
    setEnabled(true);
    setMessage('Requesting device location…');
    const orientation = window.DeviceOrientationEvent as typeof DeviceOrientationEvent &
      { requestPermission?: () => Promise<string> };
    if (orientation?.requestPermission) {
      orientation.requestPermission().then(result => {
        if (session.current === id && result !== 'granted') setMotion('Compass permission denied.');
      }).catch(() => { if (session.current === id) setMotion('Compass unavailable.'); });
    }
  }

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let latest = -Infinity;
    let compassTime = -Infinity;
    function expire() {
      if (Date.now() - latest > 15000 && Number.isFinite(latest)) {
        setFix(null);
        setMessage('Device location is stale.');
      }
      if (Date.now() - compassTime > 5000) setHeading(null);
    }
    function orient(raw: Event) {
      const event = raw as DeviceOrientationEvent & { webkitCompassHeading?: number };
      const magnetic = event.webkitCompassHeading;
      const value = typeof magnetic === 'number' && magnetic >= 0 && magnetic < 360 ? magnetic :
        event.absolute && event.alpha !== null ? 360 - event.alpha : null;
      if (value === null || !Number.isFinite(value)) return;
      compassTime = Date.now();
      setMotion(magnetic === value ? 'Magnetic compass' : 'Absolute orientation');
      setHeading(old => smoothHeading(old, (value + (screen.orientation?.angle ?? 0) + 360) % 360));
    }
    const watch = navigator.geolocation.watchPosition(position => {
      if (!active || position.timestamp <= latest) return;
      latest = position.timestamp;
      const c = position.coords;
      if (Date.now() - latest > 15000 || latest > Date.now() + 1000 ||
          !Number.isFinite(c.latitude) || !Number.isFinite(c.longitude) ||
          !Number.isFinite(c.accuracy) || c.accuracy < 0) {
        setFix(null); setMessage('Device reading unavailable or stale.'); return;
      }
      const before = model.current.floor;
      model.current.update({ altitude: c.altitude, accuracy: c.altitudeAccuracy, time: latest });
      if (model.current.floor && model.current.floor !== before) callback.current(model.current.floor);
      setFix(position);
      setMessage(c.accuracy > 10 ? 'Poor indoor horizontal accuracy.' : 'Device location received.');
    }, error => {
      if (!active) return;
      setFix(null);
      setMessage(error.code === 1 ? 'Location permission denied.' :
        error.code === 3 ? 'Device location timed out.' : 'Device location unavailable.');
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    const timer = window.setInterval(expire, 1000);
    document.addEventListener('visibilitychange', expire);
    window.addEventListener('deviceorientation', orient);
    window.addEventListener('deviceorientationabsolute', orient);
    return () => {
      active = false;
      navigator.geolocation.clearWatch(watch);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', expire);
      window.removeEventListener('deviceorientation', orient);
      window.removeEventListener('deviceorientationabsolute', orient);
    };
  }, [enabled]);

  function calibrate(floor: SensorFloor) {
    if (!fix || Date.now() - fix.timestamp > 15000) return;
    setManualFloor(floor);
    model.current = new FloorEstimator();
    callback.current(floor);
    const ok = model.current.calibrate(floor, { altitude: fix.coords.altitude,
      accuracy: fix.coords.altitudeAccuracy, time: fix.timestamp });
    setMessage(ok ? 'Floor reference calibrated.' : 'Floor confirmed manually. More accurate altitude is needed for automatic transitions.');
    if (ok) callback.current(floor);
  }

  return <div>
    <button type="button" onClick={() => {
      if (!enabled) return start();
      session.current++; setAnchor(null); setManualFloor(2); setEnabled(false); setFix(null); setHeading(null); setMotion('');
      setMessage(''); model.current = new FloorEstimator();
    }}>{enabled ? 'Stop device tracking' : 'Track device location'}</button>
    {message && <p role="status">{message}</p>}
    {enabled && <p>Live device readings · Fire conditions are simulated.</p>}
    {fix && <p>Horizontal accuracy ±{Math.round(fix.coords.accuracy)} m · Altitude {fix.coords.altitude === null ? 'unavailable' : fix.coords.altitude.toFixed(1) + ' m'}</p>}
    {enabled && <p>{heading !== null ? motion + ' ' + Math.round(heading) % 360 + '°' :
      fix && (fix.coords.speed ?? 0) > 1 && fix.coords.heading !== null ? 'Travel direction ' + Math.round(fix.coords.heading) + '°' : motion.includes('permission') ? motion : 'Heading unavailable'}</p>}
    {enabled && <p>Estimated floor {estimatedFloor} · {fix && model.current.confident ? 'calibrated estimate' : 'manual or last known'}</p>}
    {fix && <button type="button" disabled={fix.coords.accuracy > 10} onClick={() => {
      if (Date.now() - fix.timestamp > 15000) return;
      setAnchor(fix.coords); calibrate(2);
    }}>Set my position at Bethancourt center</button>}
    {anchor && <p>Approximate north-up alignment from your center check-in.</p>}
    {fix && ([1,2] as const).map(floor => <button type="button" key={floor} onClick={() => calibrate(floor)}>Calibrate on Floor {floor}</button>)}
  </div>;
}
