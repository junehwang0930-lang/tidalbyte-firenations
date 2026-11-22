import { useEffect, useRef, useState } from 'react';

export type AtlasRoute = {
  status: 'ok' | 'no_route'; reason: string; stair: string | null; exitName: string | null;
  assumedLanding: boolean; legs: { level: number; points: [number, number][] }[];
  firePolygon: [number, number][];
  forecast: { elapsed: number; horizon: number; cellSize: number; smoke: string; heat: string } | null;
};
type Catalog = { rooms: { id: string; label: string }[]; defaultRoom: string };

export function useAtlas() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [offline, setOffline] = useState(false);
  const [origin, setOrigin] = useState('');
  const [fire, setFire] = useState('');
  const [route, setRoute] = useState<AtlasRoute | null>(null);
  const [error, setError] = useState('Loading training map…');
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);
  const ignition = useRef<number | null>(null);
  const requestId = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/floor-atlas/scenario/catalog', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw Error('Atlas unavailable. Start the demo backend on localhost.');
      return response.json() as Promise<Catalog>;
    }).catch(async reason => {
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
      const request = offline
        ? import('./atlasOffline').then(({ offlineRoute }) => offlineRoute(origin, fire, elapsed))
        : fetch(`/api/floor-atlas/scenario/route?${query}`, { signal: controller.signal, cache: 'no-store' })
          .then(async response => { if (!response.ok) throw Error('Route unavailable. Clear/reset the scenario or check the backend.'); return response.json() as Promise<AtlasRoute>; });
      request
        .then(result => { if (id === requestId.current) setRoute(result); })
        .catch(reason => { if (id === requestId.current && !controller.signal.aborted) setError(reason.message); })
        .finally(() => { if (id === requestId.current) setLoading(false); });
    }
    const resume = () => { if (document.visibilityState === 'visible') calculate(); };
    calculate(); document.addEventListener('visibilitychange', resume);
    return () => { ++requestId.current; controller?.abort(); window.clearTimeout(timer); document.removeEventListener('visibilitychange', resume); };
  }, [origin, fire, version, offline]);
  const invalidate = () => { ++requestId.current; setRoute(null); setError(''); };
  return { catalog, offline, origin, fire, route, error, loading,
    selectOrigin: (value: string) => { invalidate(); setOrigin(value); setVersion(v => v + 1); },
    selectFire: (value: string) => { invalidate(); ignition.current = value ? Date.now() : null; setFire(value); setVersion(v => v + 1); },
    refresh: () => { invalidate(); setVersion(v => v + 1); },
    reset: () => { invalidate(); ignition.current = null; setFire(''); setOrigin(catalog?.defaultRoom ?? ''); setVersion(v => v + 1); },
  };
}
