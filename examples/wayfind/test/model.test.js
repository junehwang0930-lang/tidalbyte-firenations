import test from "node:test";
import assert from "node:assert/strict";
import { plan, signedAngle, edges } from "../public/model.js";
// Standalone routing fixtures: no dependency on the simulation PR.
function incident(preset, t, origin = 0, refuge = false) {
  const deadlines = Object.fromEntries(edges.map(([, , zone]) => [zone, null]));
  if (preset === "smoke") deadlines["east-hall"] = origin + 25;
  return { deadlines, closed: preset === "blocked" ? ["east-door", "west-door"] : [], refuge };
}
test("shortest route uses an exit through a connected junction", () => {
  assert.deepEqual(plan("start", 0, incident("fire", 0)).path, [
    "start",
    "j",
    "east",
    "exitA",
  ]);
  assert.equal(plan("south", 0, incident("fire", 0)).id, "exitB");
});
test("forecast reroutes before exposure", () =>
  assert.equal(plan("start", 0, incident("smoke", 0)).id, "exitB"));
test("blocked exits with and without a training refuge", () => {
  assert.equal(plan("start", 0, incident("blocked", 0)), null);
  assert.equal(
    plan("start", 0, incident("blocked", 0, 0, true)).kind,
    "refuge",
  );
  const h = incident("blocked", 0, 0, true);
  h.deadlines["refuge-door"] = 0;
  assert.equal(plan("start", 0, h), null);
});
test("compass wraps continuously", () => {
  assert.equal(signedAngle(1 - 359), 2);
  assert.equal(signedAngle(359 - 1), -2);
});

test("unknown pathway deadlines are excluded rather than treated as clear", () => {
  assert.equal(plan("start", 0, { closed: [], deadlines: {} }), null);
  const h = incident("fire", 0);
  delete h.deadlines["east-hall"];
  assert.equal(plan("start", 0, h).id, "exitB");
});

test("malformed hazard data and route inputs fail closed", () => {
  for (const t of [NaN, Infinity, -1, "0"]) {
    assert.equal(plan("start", t, incident("fire", 0)), null);
  }
  for (const deadline of [NaN, Infinity, -1, "0", undefined]) {
    const h = incident("fire", 0);
    h.deadlines.gallery = deadline;
    assert.equal(plan("start", 0, h), null);
  }
  for (const h of [null, {}, { closed: null, deadlines: {} }]) {
    assert.equal(plan("start", 0, h), null);
  }
  assert.equal(plan("missing", 0, incident("fire", 0)), null);
});
