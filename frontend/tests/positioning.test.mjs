import test from 'node:test';
import assert from 'node:assert/strict';
import { FloorEstimator, smoothHeading, projectFix, relativeFix } from '../src/positioning.ts';
test('heading takes short arc across north', () => {
  assert.ok(smoothHeading(359,0)>359);
  assert.ok(smoothHeading(0,359)>359);
});
test('floor changes require sustained accurate readings in both directions', () => {
  const f=new FloorEstimator();
  const sample=(altitude,time,accuracy=.5)=>({altitude,time,accuracy});
  assert.equal(f.calibrate(1,sample(100,0)),true);
  f.update(sample(102.5,1000));
  assert.equal(f.floor,1);
  for(let t=2000;t<=7000;t+=1000) f.update(sample(102.5,t));
  assert.equal(f.floor,2);
  f.update(sample(100,8000,null));
  assert.equal(f.floor,2);
  assert.equal(f.confident,false);
  for(let t=9000;t<=17000;t+=1000) f.update(sample(100,t));
  assert.equal(f.floor,1);
});
test('uncalibrated and inaccurate fixes never project', () => {
  assert.equal(projectFix([],0,0,1,1),null);
  const refs=[{latitude:0,longitude:0,x:20,y:20},{latitude:.001,longitude:0,x:20,y:120},{latitude:0,longitude:.001,x:120,y:20}];
  assert.equal(projectFix(refs,.0002,.0002,50,1),null);
  assert.equal(projectFix(refs,.01,.01,1,1),null);
  const fix=projectFix(refs,.0002,.0002,2,1);
  assert.ok(Math.abs(fix.x-40)<.001 && Math.abs(fix.y-40)<.001);
});

test('Bethancourt requires an unambiguous Level 2 section', async () => {
  const { matchBethancourt } = await import('../src/positioning.ts');
  const { readFileSync } = await import('node:fs');
  const { rooms } = JSON.parse(readFileSync(new URL('../../data/floor-atlas/scenario.json', import.meta.url)));
  for (const room of rooms.filter(r => r.label.includes('Bethancourt'))) {
    const [first,, opposite] = room.polygon;
    const fix = {x:(first[0]+opposite[0])/2, y:(first[1]+opposite[1])/2, radius:3, floor:2};
    assert.equal(matchBethancourt(fix, rooms),room.id);
    assert.equal(matchBethancourt({...fix,floor:1},rooms),null);
  }
  assert.equal(matchBethancourt({x:208,y:500,radius:4,floor:2},rooms),null);
  assert.equal(matchBethancourt(null,rooms),null);
});

test('ballroom check-in projects movement north and east on both floors', () => {
  const anchor = { latitude: 30, longitude: -96, accuracy: 2 };
  const moved = { ...anchor, latitude: 30 + 10 / 111320, longitude: -96 + 10 / (111320 * Math.cos(Math.PI / 6)) };
  for (const floor of [1, 2]) {
    const start = relativeFix(anchor, anchor, floor);
    const fix = relativeFix(anchor, moved, floor);
    if (floor === 2) assert.deepEqual([start.x, start.y], [264, 524]);
    assert.ok(fix.x > start.x && fix.y < start.y);
    assert.ok(fix.radius > 0);
    assert.equal(relativeFix(anchor, { ...moved, accuracy: 40 }, floor), null);
    assert.equal(relativeFix(anchor, { ...moved, latitude: 31 }, floor), null);
  }
});
