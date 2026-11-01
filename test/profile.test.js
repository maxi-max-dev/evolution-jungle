const test = require('node:test');
const assert = require('node:assert');
const DATA = require('../data/seasons.js');
const P = require('../js/profile.js');

const nest = { river: 0, mountain: 0, nest: 10 };
const rec = (scouts, alloc = nest, eventAction = null) => ({ scouts, alloc, finalAlloc: alloc, eventAction });
const pathA = [rec(['water', 'herd', 'wind']), rec(['water', 'herd', 'wind']), rec(['water', 'herd'])];
const pathB = [rec([]), rec(['scope']), rec([])];

test('path A: nest plus concrete condition becomes elephant and migration rule', () => {
  assert.ok(P.shouldTriggerNight(pathA));
  const p = P.computeProfile(pathA, DATA.seasons, { answer: 'rise', pickedLowest: true }, false);
  assert.equal(p.species, 'elephant');
  assert.equal(p.watch_reason, 'waiting_for_evidence');
  assert.equal(p.recommendation.task, 'migration_rule');
});

test('path B: same nest choices become squirrel and read chart', () => {
  assert.ok(P.shouldTriggerNight(pathB));
  const p = P.computeProfile(pathB, DATA.seasons, { answer: 'vague', pickedLowest: false }, false);
  assert.equal(p.species, 'squirrel');
  assert.equal(p.watch_reason, 'does_not_understand');
  assert.equal(p.recommendation.task, 'read_chart');
});

test('concrete condition with wrong pick keeps judgement open', () => {
  const p = P.computeProfile(pathA, DATA.seasons, { answer: 'rise', pickedLowest: false }, false);
  assert.equal(p.watch_reason, 'undetermined');
  assert.ok(p.uncertain.some((u) => u.includes('不一致')));
});

test('profile ignores population: extra fields change nothing and confidence is never high', () => {
  const a = P.computeProfile(pathA, DATA.seasons, null, false);
  const withPop = pathA.map((r) => ({ ...r, population: 9999 }));
  const b = P.computeProfile(withPop, DATA.seasons, null, false);
  assert.deepEqual(a, b);
  assert.equal(P.computeProfile.length, 4);
  Object.values(a.dimensions).forEach((d) => assert.notEqual(d.confidence, 'high'));
});

test('doubling down on counter evidence routes to counter example', () => {
  const bet = { river: 8, mountain: 0, nest: 2 };
  const recs = [rec(['water'], bet, 'hold'), rec(['water'], bet, 'double'), rec(['water'], bet, 'hold')];
  const p = P.computeProfile(recs, DATA.seasons, null, false);
  assert.equal(p.recommendation.task, 'counter_example');
  assert.equal(p.watch_reason, null);
});

test('completing the task updates the profile', () => {
  const before = P.computeProfile(pathB, DATA.seasons, { answer: 'vague', pickedLowest: false }, false);
  const after = P.computeProfile(pathB, DATA.seasons, { answer: 'vague', pickedLowest: false }, true);
  assert.equal(before.dimensions.evidence.level, 'low');
  assert.equal(after.dimensions.evidence.level, 'medium');
  assert.equal(after.next_step.status, 'completed');
});
