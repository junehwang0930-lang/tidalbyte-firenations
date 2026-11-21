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
export function plan(start, t, h) {
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
      if (t + distance / 1.25 + 5 >= (h.deadlines[zone] ?? Infinity)) continue;
      queue.push({ id: next, path: [...item.path, next], distance });
    }
  }
  return fallback;
}
export const signedAngle = (angle) => (((angle % 360) + 540) % 360) - 180;
