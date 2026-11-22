import test from 'node:test';
import assert from 'node:assert/strict';
import { FloorEstimator, smoothHeading, projectFix } from '../src/positioning.ts';
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
