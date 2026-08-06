"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Physics = require("../js/physics.js");

function almostEqual(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);
}

test("S-DMT constants are represented exactly as declared", () => {
  almostEqual(Physics.SDMT.gamma, Math.sqrt(5) / 13);
  almostEqual(Physics.SDMT.C, 1 / Math.sqrt(2));
  assert.equal(Physics.SDMT.beta, 11.653);
  assert.equal(Physics.SDMT.strictionAngleDeg, 55.17);
  assert.equal(Physics.SDMT.massGapHz, 1);
});

test("normal-incidence lossless intensity coefficients conserve energy", () => {
  const coefficients = Physics.normalIncidenceCoefficients(
    Physics.MATERIALS.soft,
    Physics.MATERIALS.muscle
  );
  almostEqual(coefficients.intensityReflection + coefficients.intensityTransmission, 1, 1e-12);
  assert.ok(coefficients.intensityReflection >= 0 && coefficients.intensityReflection <= 1);
  assert.ok(coefficients.intensityTransmission >= 0 && coefficients.intensityTransmission <= 1);
});

test("homogeneous focus law aligns element arrival phases", () => {
  const state = Physics.sanitizeState({
    elements: 20,
    apertureMm: 75,
    frequencyMHz: 0.7,
    focusXmm: 11,
    focusZmm: 67,
    steeringDeg: 0,
    phaseLaw: "focus",
    mediumOne: "soft",
    mediumTwo: "soft",
    includeReflection: false
  });
  const positions = Physics.elementPositions(state);
  const phases = Physics.calculateElementPhases(state);
  positions.forEach((position, index) => {
    const arrival = Physics.pathPhaseRadians(position, state.focusXmm, state.focusZmm, state, false) + phases[index];
    almostEqual(Physics.wrapPhase(arrival), 0, 2e-12);
  });
});

test("heterogeneous delay law aligns straight-ray arrival phases", () => {
  const state = Physics.sanitizeState({
    elements: 18,
    apertureMm: 68,
    frequencyMHz: 0.55,
    focusXmm: -9,
    focusZmm: 83,
    interfaceDepthMm: 31,
    steeringDeg: 0,
    phaseLaw: "heterogeneous",
    mediumOne: "fat",
    mediumTwo: "muscle",
    includeReflection: false
  });
  const positions = Physics.elementPositions(state);
  const phases = Physics.calculateElementPhases(state);
  positions.forEach((position, index) => {
    const arrival = Physics.pathPhaseRadians(position, state.focusXmm, state.focusZmm, state, true) + phases[index];
    almostEqual(Physics.wrapPhase(arrival), 0, 2e-12);
  });
});

test("default rectangular L39 proxy resolves deterministically", () => {
  const mode = Physics.resolveRectangularMode(39, 120, 120, 1540);
  assert.deepEqual({ m: mode.m, n: mode.n, rank: mode.rank }, { m: 7, n: 3, rank: 39 });
  almostEqual(mode.frequencyHz, 48867.87742929341, 1e-8);
});

test("field solve is deterministic and bounded after normalisation", () => {
  const state = Physics.sanitizeState({
    gridWidth: 52,
    gridHeight: 44,
    elements: 12,
    phaseLaw: "golden",
    goldenStrength: 0.39
  });
  const first = Physics.computeField(state);
  const second = Physics.computeField(state);
  assert.equal(Physics.fingerprintState(first.state), Physics.fingerprintState(second.state));
  assert.deepEqual(first.elementPhasesRad, second.elementPhasesRad);
  assert.deepEqual(first.amplitude, second.amplitude);
  assert.ok(first.amplitude.every((value) => Number.isFinite(value) && value >= 0 && value <= 1));
  assert.ok(first.modeOverlap >= 0 && first.modeOverlap <= 1);
});

test("all built-in presets solve to finite fields", () => {
  for (const name of Object.keys(Physics.PRESETS)) {
    const state = Physics.applyPreset(name, Object.assign({}, Physics.DEFAULT_STATE, {
      gridWidth: 46,
      gridHeight: 42
    }));
    state.gridWidth = 46;
    state.gridHeight = 42;
    const field = Physics.computeField(state);
    assert.ok(field.amplitude.every(Number.isFinite), `${name}: non-finite amplitude`);
    assert.ok(Number.isFinite(field.metrics.mechanicalIndexProxy), `${name}: non-finite MI proxy`);
    assert.ok(Number.isFinite(field.metrics.isptaProxyWcm2), `${name}: non-finite intensity proxy`);
  }
});

test("attenuation decreases monotonically along a homogeneous path", () => {
  const state = Physics.sanitizeState({
    frequencyMHz: 1,
    mediumOne: "muscle",
    mediumTwo: "muscle",
    interfaceDepthMm: 119
  });
  const shallow = Physics.pathAttenuation(0, 0, 20, state);
  const deep = Physics.pathAttenuation(0, 0, 80, state);
  assert.ok(deep < shallow);
  assert.ok(deep > 0);
});

test("MI proxy follows declared derating equation", () => {
  const state = Physics.sanitizeState({
    frequencyMHz: 1,
    referencePressureMpa: 1,
    focusZmm: 100,
    dutyCycle: 0.25
  });
  const metrics = Physics.estimateMetrics(state, null);
  const expectedPressure = Math.pow(10, -(0.3 * 1 * 10) / 20);
  almostEqual(metrics.deratedPressureMpa, expectedPressure, 1e-12);
  almostEqual(metrics.mechanicalIndexProxy, expectedPressure, 1e-12);
  assert.equal(metrics.temperatureRiseC, null);
  assert.equal(metrics.thermalIndex, null);
});

test("printed S-DMT frequency expressions do not reproduce any supplied tissue band", () => {
  const audit = Physics.auditClaimedTissueBands();
  assert.equal(audit.length, 4);
  assert.ok(audit.every((row) => row.matchesWithoutAdditionalNormalization === false));
  assert.equal(audit[0].inverseOctaveHz, Math.pow(8, 21));
  assert.equal(audit[3].inverseOctaveHz, 4096);
});

test("canonical state fingerprints ignore display-only view changes", () => {
  const first = Physics.fingerprintState({ view: "amplitude", modeOverlay: true });
  const second = Physics.fingerprintState({ view: "phase", modeOverlay: false });
  assert.equal(first, second);
  assert.notEqual(first, Physics.fingerprintState({ frequencyMHz: 0.75 }));
});

test("experiment export preserves model boundaries", () => {
  const state = Physics.sanitizeState({ gridWidth: 48, gridHeight: 42, elements: 10 });
  const field = Physics.computeField(state);
  const record = Physics.createExperimentRecord(state, field);
  assert.equal(record.schemaVersion, 1);
  assert.match(record.fingerprint, /^tas-[0-9a-f]{8}$/);
  assert.equal(record.derived.metrics.temperatureRiseC, null);
  assert.ok(record.limitations.some((line) => line.includes("Not a medical device")));
  assert.ok(record.limitations.some((line) => line.includes("L39")));
});
