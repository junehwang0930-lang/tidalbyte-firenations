import test from "node:test";
import assert from "node:assert/strict";
import { arrivalTimes } from "../public/forecast.js";
test("mapped offline forecast keeps earliest hazard for an edge", () => {
  assert.equal(
    arrivalTimes("smoke", 10, {
      events: [3, 5].map((afterSeconds) => ({
        kind: "smoke",
        zone: "west-hall",
        scenario: "smoke",
        afterSeconds,
      })),
    })["west-hall"],
    13,
  );
});

test("default forecast explicitly identifies modeled unaffected zones", () => {
  assert.equal(arrivalTimes('fire', 0).gallery, null);
  assert.equal(arrivalTimes('fire', 0)['unmodeled-zone'], undefined);
  assert.equal(arrivalTimes('smoke', 10)['east-hall'], 35);
  assert.equal(arrivalTimes('fire', 0, { events: [] }).gallery, undefined);
});
