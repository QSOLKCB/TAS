"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

global.TASPhysics = require("../js/physics.js");
const Audio = require("../js/audio.js");

function ascii(bytes, start, length) {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

test("smooth pulse remains bounded", () => {
  for (let index = 0; index < 1000; index += 1) {
    const value = Audio.softPulse(index / 1000, 3.7, 0.23);
    assert.ok(value >= 0 && value <= 1);
  }
});

test("audible mapping is explicit and anchored to 432 Hz", () => {
  const parameters = Audio.audioParameters(global.TASPhysics.DEFAULT_STATE, null);
  assert.equal(parameters.baseHz, 432);
  assert.match(parameters.mapping, /ultrasound carrier omitted/);
  assert.ok(parameters.modeAHz > parameters.baseHz);
  assert.ok(parameters.modeBHz > parameters.baseHz);
});

test("WAV encoder writes a valid deterministic stereo PCM header", () => {
  const sampleRate = 8000;
  const samples = Audio.floatSamples(global.TASPhysics.DEFAULT_STATE, null, 0.1, sampleRate);
  const first = Audio.encodeWav(samples);
  const second = Audio.encodeWav(Audio.floatSamples(global.TASPhysics.DEFAULT_STATE, null, 0.1, sampleRate));
  assert.equal(ascii(first, 0, 4), "RIFF");
  assert.equal(ascii(first, 8, 4), "WAVE");
  assert.equal(ascii(first, 12, 4), "fmt ");
  assert.equal(ascii(first, 36, 4), "data");
  assert.equal(first.length, 44 + Math.floor(0.1 * sampleRate) * 2 * 2);
  assert.deepEqual(first, second);
});

