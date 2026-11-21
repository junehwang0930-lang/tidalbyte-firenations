// Normalized times since scenario activation. Replace with mapped offline output.
export const forecast = {
  source: "Illustrative zone timeline",
  license: "Project fixture",
  events: [
    { scenario: "fire", kind: "fire", zone: "fire-room", afterSeconds: 0 },
    { scenario: "smoke", kind: "smoke", zone: "east-hall", afterSeconds: 25 },
  ],
};
export function arrivalTimes(preset, origin, data = forecast) {
  const deadlines = {};
  for (const e of data.events) {
    if (
      (e.scenario !== "fire" && e.scenario !== preset) ||
      !["fire", "smoke"].includes(e.kind) ||
      !Number.isFinite(e.afterSeconds) ||
      e.afterSeconds < 0
    )
      continue;
    const t = (e.scenario === "fire" ? 0 : origin) + e.afterSeconds;
    deadlines[e.zone] = Math.min(deadlines[e.zone] ?? Infinity, t);
  }
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
