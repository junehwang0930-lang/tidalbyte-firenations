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
