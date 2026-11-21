// Normalized times since scenario activation. Replace with mapped offline output.
export const forecast = {
  source: "Illustrative zone timeline",
  license: "Project fixture",
  // Explicit scenario coverage, not evidence about any real building.
  modeledZones: ["gallery", "east-hall", "east-door", "west-hall", "south-hall", "west-door", "refuge-door"],
  events: [
    { scenario: "fire", kind: "fire", zone: "fire-room", afterSeconds: 0 },
    { scenario: "smoke", kind: "smoke", zone: "east-hall", afterSeconds: 25 },
  ],
};
export function arrivalTimes(preset, origin, data = forecast) {
  if (!['fire', 'smoke', 'blocked'].includes(preset) ||
      !Number.isFinite(origin) || origin < 0 || !data ||
      !Array.isArray(data.events) ||
      (data.modeledZones !== undefined && (!Array.isArray(data.modeledZones) ||
        !data.modeledZones.every(zone => typeof zone === 'string' && zone.length > 0)))) return {};
  // null means explicitly modeled with no arrival; absent means unknown.
  const deadlines = Object.fromEntries((data.modeledZones ?? []).map(zone => [zone, null]));
  const unknown = new Set();
  for (const e of data.events) {
    if (!e || typeof e !== 'object') return {};
    if (e.scenario !== 'fire' && e.scenario !== preset) continue;
    if (typeof e.zone !== 'string' || !e.zone) return {};
    if (
      !["fire", "smoke"].includes(e.kind) ||
      !Number.isFinite(e.afterSeconds) ||
      e.afterSeconds < 0
    ) {
      unknown.add(e.zone);
      continue;
    }
    const t = (e.scenario === "fire" ? 0 : origin) + e.afterSeconds;
    if (!Number.isFinite(t)) { unknown.add(e.zone); continue; }
    deadlines[e.zone] = Math.min(deadlines[e.zone] ?? Infinity, t);
  }
  for (const zone of unknown) delete deadlines[zone];
  return deadlines;
}

export function incident(preset, t, origin = 0, refuge = false) {
  const deadlines = arrivalTimes(preset, origin);
  return {
    deadlines,
    closed: preset === "blocked" ? ["east-door", "west-door"] : [],
    refuge,
    fireRadius: Math.min(38, 27 + t * 0.08),
  };
}
