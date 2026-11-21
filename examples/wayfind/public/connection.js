// Ordering is scoped to a server process, not just a scenario reset counter.
export function createSnapshotGate() {
  let current = null;
  const retired = new Set();
  return (incoming) => {
    if (!incoming || typeof incoming.sessionId !== 'string' || !incoming.sessionId ||
        !Number.isSafeInteger(incoming.epoch) || incoming.epoch < 0 ||
        !Number.isSafeInteger(incoming.seq) || incoming.seq < 0 ||
        !Number.isFinite(incoming.timestamp) || incoming.timestamp < 0 ||
        retired.has(incoming.sessionId)) return false;
    if (current?.sessionId === incoming.sessionId) {
      if (incoming.epoch < current.epoch ||
          (incoming.epoch === current.epoch && (incoming.seq < current.seq ||
            (incoming.seq === current.seq && incoming.timestamp < current.timestamp)))) return false;
    } else if (current) {
      retired.add(current.sessionId);
    }
    current = incoming;
    return true;
  };
}

export function connectIncidentFeed({
  target = window, Source = EventSource, onSnapshot, onError, onSuspend, onResume,
}) {
  let active = null;
  function open() {
    if (active) return false;
    const source = new Source('/api/events');
    active = source;
    source.onmessage = event => {
      if (active !== source) return;
      try { onSnapshot(JSON.parse(event.data)); } catch { onError(); }
    };
    source.onerror = () => { if (active === source) onError(); };
    return true;
  }
  function hide() {
    const source = active;
    active = null;
    source?.close();
    onSuspend();
  }
  function show() {
    if (open()) onResume();
  }
  open();
  target.addEventListener('pagehide', hide);
  target.addEventListener('pageshow', show);
  return () => {
    hide();
    target.removeEventListener('pagehide', hide);
    target.removeEventListener('pageshow', show);
  };
}
