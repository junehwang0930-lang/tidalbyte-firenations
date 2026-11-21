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

test('invalid forecast events never become an explicitly unaffected zone', () => {
  for (const afterSeconds of [-1, NaN, Infinity, '25']) {
    const deadlines = arrivalTimes('smoke', 0, {
      modeledZones: ['east-hall', 'gallery'],
      events: [afterSeconds, 25].map(value => ({
        scenario: 'smoke', kind: 'smoke', zone: 'east-hall', afterSeconds: value,
      })),
    });
    assert.equal(deadlines['east-hall'], undefined);
    assert.equal(deadlines.gallery, null);
  }
  assert.deepEqual(arrivalTimes('smoke', NaN), {});
  assert.deepEqual(arrivalTimes('smoke', 0, { modeledZones: ['gallery'] }), {});
});
