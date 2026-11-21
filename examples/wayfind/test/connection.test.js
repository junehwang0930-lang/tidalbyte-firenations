import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnapshotGate, connectIncidentFeed } from '../public/connection.js';

const snapshot = (sessionId, epoch = 0, seq = 0, timestamp = 100) => ({ sessionId, epoch, seq, timestamp });

test('new server sessions reset ordering and delayed retired sessions are ignored', () => {
  const accept = createSnapshotGate();
  assert.equal(accept(snapshot('first', 2, 5)), true);
  assert.equal(accept(snapshot('first', 1, 9)), false);
  assert.equal(accept(snapshot('second', 0, 0, 101)), true);
  assert.equal(accept(snapshot('first', 3, 9, 102)), false);
  assert.equal(accept(snapshot('second', 0, 1, 102)), true);
  assert.equal(accept(snapshot('second', 0, 0, 103)), false);
});

test('invalid ordering fields cannot replace the current snapshot', () => {
  const accept = createSnapshotGate();
  for (const value of [null, {}, snapshot('', 0), snapshot('a', NaN), snapshot('a', 0, -1)]) {
    assert.equal(accept(value), false);
  }
  assert.equal(accept(snapshot('a')), true);
});

test('history restoration opens one fresh stream and ignores the closed stream', () => {
  const target = new EventTarget();
  const sources = [];
  class Source {
    constructor() { sources.push(this); this.closed = false; }
    close() { this.closed = true; }
  }
  const received = [];
  let resumed = 0;
  let suspended = 0;
  const dispose = connectIncidentFeed({ target, Source,
    onSnapshot: s => received.push(s), onError: () => {},
    onSuspend: () => suspended++, onResume: () => resumed++,
  });
  sources[0].onmessage({ data: '{"seq":1}' });
  target.dispatchEvent(new Event('pagehide'));
  assert.equal(sources[0].closed, true);
  assert.equal(suspended, 1);
  target.dispatchEvent(new Event('pageshow'));
  target.dispatchEvent(new Event('pageshow'));
  assert.equal(sources.length, 2);
  assert.equal(resumed, 1);
  sources[0].onmessage({ data: '{"seq":99}' });
  sources[1].onmessage({ data: '{"seq":2}' });
  assert.deepEqual(received, [{ seq: 1 }, { seq: 2 }]);
  dispose();
  assert.equal(sources[1].closed, true);
  target.dispatchEvent(new Event('pageshow'));
  assert.equal(sources.length, 2);
});
