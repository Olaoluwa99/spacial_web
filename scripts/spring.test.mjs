import test from 'node:test';
import assert from 'node:assert/strict';
import { springPosition, springSamples } from '../src/scripts/spring.ts';

test('all damping regimes start at rest and converge to the destination', () => {
  for (const ratio of [.35, .8, 1, 1.2]) {
    assert.ok(Math.abs(springPosition(0, 80, ratio)) < 1e-12);
    assert.ok(Math.abs(springPosition(5, 80, ratio) - 1) < 1e-6);
  }
});
test('critical damping follows the known response and never overshoots', () => {
  assert.ok(Math.abs(springPosition(.1, 100, 1) - (1 - 2 / Math.E)) < 1e-12);
  let previous = 0;
  for (let t = 0; t < 2; t += .01) {
    const value = springPosition(t, 100, 1);
    assert.ok(value >= previous && value <= 1);
    previous = value;
  }
});
test('low damping produces a bounce while overdamping remains monotonic', () => {
  assert.ok(springPosition(Math.PI / Math.sqrt(100 * (1 - .45 ** 2)), 100, .45) > 1.1);
  let previous = 0;
  for (let t = 0; t < 2; t += .01) {
    const value = springPosition(t, 100, 1.2);
    assert.ok(value >= previous && value <= 1);
    previous = value;
  }
});
test('exported curves settle across the complete control range', () => {
  for (const stiffness of [80, 220, 380, 900]) for (const damping of [.35, .45, .8, 1, 1.2]) {
    const curve = springSamples(stiffness, damping);
    assert.equal(curve.values[0], 0);
    assert.equal(curve.values.at(-1), 1);
    assert.ok(curve.values.every(Number.isFinite));
    assert.ok(curve.duration > 0 && curve.duration <= 2400);
    assert.ok(Math.abs(springPosition(curve.duration / 1000, stiffness, damping) - 1) < .001);
  }
});
