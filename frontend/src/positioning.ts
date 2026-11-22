// Provisional MSC assumptions, in meters. Calibrate against a known floor.
export const floorElevation = { 1: 109.728, 2: 112.1664 } as const;
export type SensorFloor = keyof typeof floorElevation;

export function smoothHeading(previous: number | null, next: number) {
  if (previous === null) return (next + 360) % 360;
  const delta = ((next - previous + 540) % 360) - 180;
  return (previous + delta * .4 + 360) % 360;
}

export type ElevationReading = { altitude: number | null; accuracy: number | null; time: number };

export class FloorEstimator {
  floor: SensorFloor | null = null;
  offset = 0;
  candidate: SensorFloor | null = null;
  changedAt: number | null = null;
  filtered: number | null = null;
  confident = false;
  private samples: number[] = [];
  private since = 0;
  private lastTime = -Infinity;

  calibrate(floor: SensorFloor, reading: ElevationReading) {
    if (!this.reliable(reading)) return false;
    this.offset = floorElevation[floor] - reading.altitude;
    this.floor = floor;
    this.samples = [];
    this.candidate = null;
    this.filtered = floorElevation[floor];
    this.lastTime = reading.time;
    this.changedAt = reading.time;
    this.confident = true;
    return true;
  }

  private reliable(r: ElevationReading): r is ElevationReading & { altitude: number } {
    return r.altitude !== null && Number.isFinite(r.altitude) && r.accuracy !== null &&
      r.accuracy >= 0 && r.accuracy <= 1 && Number.isFinite(r.time);
  }

  update(r: ElevationReading) {
    if (!this.floor || r.time <= this.lastTime) return;
    const gap = r.time - this.lastTime;
    this.lastTime = r.time;
    if (!this.reliable(r) || gap > 15000) {
      this.confident = false;
      this.candidate = null;
      this.samples = [];
      return;
    }
    const elevation = r.altitude + this.offset;
    if (this.filtered !== null && Math.abs(elevation - this.filtered) > 5) {
      this.candidate = null;
      this.samples = [];
      this.confident = false;
      return;
    }
    this.samples = [...this.samples.slice(-4), elevation];
    const sorted = [...this.samples].sort((a,b) => a-b);
    this.filtered = sorted[Math.floor(sorted.length / 2)];
    const next = this.filtered >= floorElevation[2] ? 2 :
      this.filtered <= floorElevation[2] - 1.2 ? 1 : null;
    this.confident = sorted.length >= 3 && next === this.floor;
    if (!next || next === this.floor) { this.candidate = null; return; }
    if (this.candidate !== next) { this.candidate = next; this.since = r.time; return; }
    if (sorted.length >= 3 && r.time - this.since >= 4000) {
      this.floor = next;
      this.changedAt = r.time;
      this.candidate = null;
      this.confident = true;
    }
  }
}

export type Reference = { latitude: number; longitude: number; x: number; y: number };
export type MapFix = { x: number; y: number; radius: number; floor: SensorFloor };

// A local affine transform is valid only inside the surveyed control triangle.
export function projectFix(refs: Reference[], latitude: number, longitude: number, accuracy: number,
  floor: SensorFloor): MapFix | null {
  if (refs.length !== 3 || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 10) return null;
  const [a,b,c] = refs;
  const east = 111320 * Math.cos(a.latitude * Math.PI / 180);
  const north = 111320;
  const bx = (b.longitude-a.longitude)*east, by = (b.latitude-a.latitude)*north;
  const cx = (c.longitude-a.longitude)*east, cy = (c.latitude-a.latitude)*north;
  const det = bx*cy-by*cx;
  if (Math.abs(det) < 1) return null;
  const dx = (longitude-a.longitude)*east, dy = (latitude-a.latitude)*north;
  const u = (dx*cy-dy*cx)/det, v = (bx*dy-by*dx)/det;
  if (u < 0 || v < 0 || u+v > 1) return null;
  const ax = b.x-a.x, ay = b.y-a.y, ex = c.x-a.x, ey = c.y-a.y;
  if (Math.abs(ax*ey-ay*ex) < 1) return null;
  const scale = Math.hypot(ax*cy-ex*by, ex*bx-ax*cx, ay*cy-ey*by, ey*bx-ay*cx)/Math.abs(det);
  const x = a.x+u*ax+v*ex, y = a.y+u*ay+v*ey;
  if (!(x >= 0 && x <= 1240 && y >= 0 && y <= 740 && Number.isFinite(scale))) return null;
  return { x, y, radius: accuracy*scale, floor };
}

// Require the entire horizontal uncertainty circle to fit inside one mapped room.
export function matchBethancourt(fix: MapFix | null, rooms: { id: string; polygon: number[][] }[]) {
  if (!fix || fix.floor !== 2 || !Number.isFinite(fix.radius) || fix.radius < 0) return null;
  const matches = rooms.filter(({ id, polygon }) => {
    if (!/^2300[A-E]$/.test(id) && id !== 'front-lobby') return false;
    let inside = false;
    for (let i = 0; i < polygon.length; i++) {
      const [x,y] = polygon[i], [u,v] = polygon[(i+1) % polygon.length];
      const dx = u-x, dy = v-y;
      const lengthSquared = dx*dx + dy*dy;
      if (!lengthSquared) continue;
      const t = Math.max(0, Math.min(1, ((fix.x-x)*dx + (fix.y-y)*dy)/lengthSquared));
      if (Math.hypot(fix.x-x-t*dx, fix.y-y-t*dy) <= fix.radius) return false;
      if ((y > fix.y) !== (v > fix.y) && fix.x < x + dx*(fix.y-y)/dy) inside = !inside;
    }
    return inside;
  });
  return matches.length === 1 ? matches[0].id : null;
}
