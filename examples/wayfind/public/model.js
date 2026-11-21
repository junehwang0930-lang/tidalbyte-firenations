// Training coordinates use a north-up grid, five drawing units per metre.
export const nodes = {
  start: [153, 359, "Gallery entrance"],
  j: [153, 246, "Gallery junction"],
  east: [301, 246, "East junction"],
  exitA: [301, 123, "East exit"],
  west: [58, 246, "West junction"],
  south: [58, 405, "South passage"],
  exitB: [10, 405, "West exit"],
  refuge: [153, 415, "Training refuge"],
};
export const edges = [
  ["start", "j", "gallery"],
  ["j", "east", "east-hall"],
  ["east", "exitA", "east-door"],
  ["j", "west", "west-hall"],
  ["west", "south", "south-hall"],
  ["south", "exitB", "west-door"],
  ["start", "refuge", "refuge-door"],
];
export const metres = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) / 5;
// Prototype deadline contract: an explicit null means this scenario models no
// hazard arrival. An absent value is unknown and must not be traversed.
export function canTraverse(zone, arrival, h) {
  if (!Number.isFinite(arrival) || arrival < 0 || !h ||
      !Array.isArray(h.closed) || !h.deadlines ||
      !Object.hasOwn(h.deadlines, zone) || h.closed.includes(zone)) return false;
  const deadline = h.deadlines[zone];
  return deadline === null ||
    (Number.isFinite(deadline) && deadline >= 0 && arrival + 5 < deadline);
}
export function plan(start, t, h) {
  if (!Object.hasOwn(nodes, start) || !Number.isFinite(t) || t < 0 ||
      !h || !Array.isArray(h.closed) || !h.closed.every(zone => typeof zone === "string") ||
      !h.deadlines || typeof h.deadlines !== "object" || Array.isArray(h.deadlines) ||
      Object.values(h.deadlines).some(value => value !== null &&
        (!Number.isFinite(value) || value < 0))) return null;
  const queue = [{ id: start, path: [start], distance: 0 }],
    seen = new Set();
  let fallback = null;
  while (queue.length) {
    queue.sort((a, b) => a.distance - b.distance);
    const item = queue.shift();
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    if (["exitA", "exitB"].includes(item.id)) return { ...item, kind: "exit" };
    if (h.refuge && item.id === "refuge")
      fallback = { ...item, kind: "refuge" };
    for (const [a, b, zone] of edges) {
      const next = a === item.id ? b : b === item.id ? a : null;
      if (!next || seen.has(next) || h.closed.includes(zone)) continue;
      const distance = item.distance + metres(nodes[item.id], nodes[next]);
      if (!canTraverse(zone, t + distance / 1.25, h)) continue;
      queue.push({ id: next, path: [...item.path, next], distance });
    }
  }
  return fallback;
}
export const signedAngle = (angle) => (((angle % 360) + 540) % 360) - 180;
