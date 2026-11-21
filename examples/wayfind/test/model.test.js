import test from "node:test";
import assert from "node:assert/strict";
import { plan, signedAngle } from "../public/model.js";
import { incident } from "../public/forecast.js";
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
