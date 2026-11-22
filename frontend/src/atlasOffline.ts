import scenario from '../../data/floor-atlas/scenario.json';
import weights from '../../backend/app/simulation/atlas_spread_weights.json';
import type { AtlasRoute } from './useAtlas';

type Point = [number, number];
type Stair = {
  id: string; point: number[]; lower: number[] | null; lowerPath: number[][];
  exitName: string | null; assumedLanding: boolean;
};

const { width, height, step, rooms } = scenario;
const horizon = 30;
const stairs = scenario.stairs as Stair[];

async function decode(text: string) {
  const bytes = Uint8Array.from(atob(text), character => character.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

let grids: Promise<[Uint8Array, Uint8Array]> | undefined;
const roomsById = new Map(rooms.map(room => [room.id, room]));

export function offlineCatalog() {
  return { rooms: rooms.map(({ id, label }) => ({ id, label })), defaultRoom: scenario.defaultRoom };
}

// Match Python's round-to-even for anchors and buffers halfway between cells.
function round(value: number) {
  return value % 1 === .5 ? Math.floor(value / 2) * 2 : Math.round(value);
}

function index([x, y]: number[]) {
  return round(y / step) * width + round(x / step);
}

function point(cell: number): Point {
  return [cell % width * step, Math.floor(cell / width) * step];
}

function neighbors(cell: number, mask: Uint8Array) {
  const x = cell % width;
  return [cell - width, x ? cell - 1 : -1, x < width - 1 ? cell + 1 : -1, cell + width]
    .filter(next => mask[next]);
}

function distances(mask: Uint8Array, zones: Uint8Array, zone: number) {
  const field = new Int32Array(mask.length).fill(-1);
  const queue: number[] = [];
  for (let cell = 0; cell < mask.length; cell++) {
    if (mask[cell] && zones[cell] === zone) {
      field[cell] = 0;
      queue.push(cell);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    for (const next of neighbors(cell, mask)) {
      if (field[next] !== -1) continue;
      field[next] = field[cell] + 1;
      queue.push(next);
    }
  }
  return field;
}

function overlay(field: Int32Array, cutoff: number) {
  const paths: string[] = [];
  for (let y = 0; y < height; y++) {
    let start = -1;
    for (let x = 0; x <= width; x++) {
      const distance = field[y * width + x];
      if (x < width && distance >= 0 && distance <= cutoff) {
        if (start < 0) start = x;
      } else if (start >= 0) {
        paths.push(`M${start * step - step / 2},${y * step}h${(x - start) * step}`);
        start = -1;
      }
    }
  }
  return paths.join('');
}

type Entry = { cell: number; cost: number };

class RouteQueue {
  private entries: Entry[] = [];

  private before(a: Entry, b: Entry) {
    return a.cost < b.cost || (a.cost === b.cost && a.cell < b.cell);
  }

  push(entry: Entry) {
    let i = this.entries.length;
    this.entries.push(entry);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.before(entry, this.entries[parent])) break;
      this.entries[i] = this.entries[parent];
      i = parent;
    }
    this.entries[i] = entry;
  }

  pop() {
    const first = this.entries[0];
    const last = this.entries.pop();
    if (!last || !this.entries.length) return first;
    let i = 0;
    while (i * 2 + 1 < this.entries.length) {
      let child = i * 2 + 1;
      if (child + 1 < this.entries.length && this.before(this.entries[child + 1], this.entries[child])) child++;
      if (!this.before(this.entries[child], last)) break;
      this.entries[i] = this.entries[child];
      i = child;
    }
    this.entries[i] = last;
    return first;
  }
}

export type DeviceStart = { floor: number; x: number; y: number; radius: number };

function lowerContinuation(fix: DeviceStart, result: AtlasRoute): AtlasRoute {
  const candidates = [];
  for (const stair of stairs) {
    if (!stair.exitName || !stair.lowerPath?.length) continue;
    for (let i = 1; i < stair.lowerPath.length; i++) {
      const [ax,ay] = stair.lowerPath[i-1], [bx,by] = stair.lowerPath[i];
      const dx = bx-ax, dy = by-ay, squared = dx*dx+dy*dy;
      if (!squared) continue;
      const t = Math.max(0,Math.min(1,((fix.x-ax)*dx+(fix.y-ay)*dy)/squared));
      const start: Point = [ax+t*dx,ay+t*dy];
      const distance = Math.hypot(fix.x-start[0],fix.y-start[1]);
      if (distance <= Math.min(fix.radius+step, 12)) candidates.push({ stair, i, start, distance });
    }
  }
  candidates.sort((a,b) => a.distance-b.distance);
  const first = candidates[0];
  if (!first || candidates.some(c => c.stair.exitName !== first.stair.exitName && c.distance <= first.distance+fix.radius))
    return {...result, reason:'Location is outside a uniquely matched modeled Level 1 exit path.'};
  return {...result, status:'ok', reason:'Approximate progress along a modeled Level 1 continuation.',
    exitName:first.stair.exitName, stair:first.stair.id, assumedLanding:first.stair.assumedLanding,
    legs:[{level:1, points:[first.start,...first.stair.lowerPath.slice(first.i) as Point[]]}]};
}

export async function offlineRoute(origin: string, fire: string, elapsed: number, device?: DeviceStart): Promise<AtlasRoute> {
  const room = roomsById.get(origin);
  const ignition = roomsById.get(fire);
  if (!room || (fire && !ignition)) throw new Error('Select a Level 2 room from the catalog.');
  const [mask, zones] = await (grids ??= Promise.all([decode(scenario.walkable), decode(scenario.zones)]));
  const field = ignition ? distances(mask, zones, ignition.zone) : null;
  const result: AtlasRoute = {
    status: 'no_route', reason: '', stair: null, exitName: null, assumedLanding: false,
    legs: [], firePolygon: (ignition?.polygon ?? []) as Point[], forecast: null,
  };
  let hard = Math.max(1, round(30 / step));
  let far = Math.max(hard + 1, round(85 / step));
  if (field) {
    const smoke = Math.floor((elapsed + horizon) / (weights.smokeSecondsPerUnit * step));
    const heat = Math.floor((elapsed + horizon) / (weights.heatSecondsPerUnit * step));
    const caution = Math.floor((elapsed + horizon + 20) / (weights.smokeSecondsPerUnit * step));
    hard = Math.max(hard, smoke, heat);
    far = Math.max(far, caution, hard + 1);
    result.forecast = { elapsed, horizon, cellSize: step, smoke: overlay(field, smoke), heat: overlay(field, heat) };
  }

  if (device?.floor === 1) return lowerContinuation(device, result);
  const start = index(device ? [device.x, device.y] : room.point);
  if (device && !mask[start]) return {...result, reason:'Position overlaps an unmapped or blocked cell.'};
  const exposure = (cell: number) => field && field[cell] >= 0 ? Math.min(far, field[cell]) : far;
  if (exposure(start) <= hard) {
    result.reason = 'Start is inside the fire exclusion zone or the predicted smoke/heat footprint.';
    return result;
  }
  const goals = new Map(stairs.filter(stair => stair.exitName && stair.lowerPath.length >= 2 &&
    stair.lowerPath[0].every((coordinate, axis) => coordinate === stair.lower?.[axis]))
    .map(stair => [index(stair.point), stair]));
  const queue = new RouteQueue();
  const best = new Float64Array(mask.length).fill(Infinity);
  const parent = new Int32Array(mask.length).fill(-1);
  best[start] = 0;
  queue.push({ cell: start, cost: 0 });
  for (let entry = queue.pop(); entry; entry = queue.pop()) {
    const { cell, cost } = entry;
    if (best[cell] !== cost) continue;
    const goal = goals.get(cell);
    if (goal) {
      const cells = [cell];
      while (cells[cells.length - 1] !== start) cells.push(parent[cells[cells.length - 1]]);
      const points: Point[] = [];
      for (const next of cells.reverse()) {
        const [x, y] = point(next);
        const [a, b] = points.slice(-2);
        if (a && b && ((a[0] === b[0] && b[0] === x) || (a[1] === b[1] && b[1] === y))) points.pop();
        points.push([x, y]);
      }
      if (goal.point.some((coordinate, axis) => coordinate !== points[points.length - 1][axis])) points.push(goal.point as Point);
      return {
        ...result, status: 'ok', reason: `Continue from the Level 1 landing to ${goal.exitName} (modeled).`,
        exitName: goal.exitName, stair: goal.id, assumedLanding: goal.assumedLanding,
        legs: [{ level: 2, points }, { level: 1, points: goal.lowerPath as Point[] }],
      };
    }
    for (const next of neighbors(cell, mask)) {
      const distance = exposure(next);
      if (distance <= hard || distance < exposure(cell)) continue;
      // One risk point outweighs any possible simple path length.
      const score = cost + (far - distance) * mask.length + 1;
      if (score >= best[next]) continue;
      best[next] = score;
      parent[next] = cell;
      queue.push({ cell: next, cost: score });
    }
  }
  result.reason = 'No modeled stair can be reached without entering or approaching the predicted hazard buffer.';
  return result;
}
