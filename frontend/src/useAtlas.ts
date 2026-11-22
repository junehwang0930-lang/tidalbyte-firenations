import { useEffect, useRef, useState } from 'react';

export type AtlasRoute = {
  status: 'ok' | 'no_route'; reason: string; stair: string | null; exitName: string | null;
  assumedLanding: boolean; legs: { level: number; points: [number, number][] }[];
  firePolygon: [number, number][];
  forecast: { elapsed: number; horizon: number; cellSize: number; smoke: string; heat: string } | null;
};
type Catalog = { rooms: { id: string; label: string }[]; defaultRoom: string };

import type { MapFix } from './positioning';

// Older mobile browsers support AbortController but lack AbortSignal.any/timeout.
async function fetchJson<T>(url: string, parent: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  parent.addEventListener('abort', abort, { once: true });
  if (parent.aborted) abort();
  const timeout = window.setTimeout(abort, 3000);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw Error('Atlas request failed.');
    return await response.json() as T;
  } finally {
    window.clearTimeout(timeout);
    parent.removeEventListener('abort', abort);
  }
}

export function useAtlas(device?: MapFix | null) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [offline, setOffline] = useState(false);
  const [manualOrigin, setOrigin] = useState('');
  const origin = device === undefined ? manualOrigin : device && catalog ? catalog.defaultRoom : '';
  const liveX = device ? Math.round(device.x / 2)*2 : undefined;
  const liveY = device ? Math.round(device.y / 2)*2 : undefined;
  const liveFloor = device?.floor, radius = device ? Math.ceil(device.radius) : undefined;
  const [resultOrigin, setResultOrigin] = useState('');
  const [fire, setFire] = useState('');
  const [route, setRoute] = useState<AtlasRoute | null>(null);
  const [error, setError] = useState('Loading training map…');
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);
  const key = [origin,liveX,liveY,liveFloor,radius,fire,version].join('/');
  const ignition = useRef<number | null>(null);
  const requestId = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    fetchJson<Catalog>('/api/floor-atlas/scenario/catalog', controller.signal).catch(async reason => {
      if (controller.signal.aborted) throw reason;
      const { offlineCatalog } = await import('./atlasOffline');
      if (!controller.signal.aborted) setOffline(true);
      return offlineCatalog();
    }).then(result => {
      if (controller.signal.aborted) return;
      setCatalog(result); setOrigin(result.defaultRoom); setError('');
    }).catch(() => {
      if (!controller.signal.aborted) setError('Training atlas unavailable.');
    });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!origin) return;
    let timer: number | undefined;
    let controller: AbortController;
    function calculate() {
      window.clearTimeout(timer);
      controller?.abort();
      controller = new AbortController();
      const id = ++requestId.current;
      const age = ignition.current === null ? 0 : Math.max(0, Date.now() - ignition.current);
      const elapsed = Math.min(86400, Math.floor(age / 1000));
      const query = new URLSearchParams({ origin, elapsed: String(elapsed) });
      if (fire) query.set('fire', fire);
      if (fire && age < 86400000) timer = window.setTimeout(calculate, 20000 - age % 20000);
      setRoute(null); setError(''); setLoading(true);
      const request = offline || liveFloor
        ? import('./atlasOffline').then(({ offlineRoute }) => offlineRoute(origin, fire, elapsed, liveFloor && liveX !== undefined && liveY !== undefined && radius !== undefined ? {floor: liveFloor, x:liveX, y:liveY, radius} : undefined))
        : fetchJson<AtlasRoute>(`/api/floor-atlas/scenario/route?${query}`, controller.signal)
          .catch(async reason => {
            if (id !== requestId.current) throw reason;
            const { offlineRoute } = await import('./atlasOffline');
            if (id === requestId.current) setOffline(true);
            return offlineRoute(origin, fire, elapsed);
          });
      request
        .then(result => { if (id === requestId.current) { setResultOrigin(key); setRoute(result); } })
        .catch(reason => { if (id === requestId.current && !controller.signal.aborted) setError(reason.message); })
        .finally(() => { if (id === requestId.current) setLoading(false); });
    }
    const resume = () => { if (document.visibilityState === 'visible') calculate(); };
    calculate(); document.addEventListener('visibilitychange', resume);
    return () => { ++requestId.current; controller?.abort(); window.clearTimeout(timer); document.removeEventListener('visibilitychange', resume); };
  }, [origin, fire, version, offline, key, liveFloor, liveX, liveY, radius]);
  const invalidate = () => { ++requestId.current; setRoute(null); setError(''); };
  return { catalog, offline, origin, fire, route: origin && resultOrigin === key ? route : null, error, loading,
    selectOrigin: (value: string) => { invalidate(); setOrigin(value); setVersion(v => v + 1); },
    selectFire: (value: string) => { invalidate(); ignition.current = value ? Date.now() : null; setFire(value); setVersion(v => v + 1); },
    refresh: () => { invalidate(); setVersion(v => v + 1); },
    reset: () => { invalidate(); ignition.current = null; setFire(''); setOrigin(catalog?.defaultRoom ?? ''); setVersion(v => v + 1); },
  };
}
