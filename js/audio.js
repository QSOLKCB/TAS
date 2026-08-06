(function attachTASAudio(global) {
  "use strict";

  const Physics = global.TASPhysics;
  let context = null;
  let activeNodes = [];

  function audioParameters(inputState, field) {
    const state = Physics.sanitizeState(inputState);
    const mode = field ? field.mode : Physics.resolveRectangularMode(
      state.modeRank,
      state.fieldWidthMm,
      state.fieldDepthMm,
      Physics.MATERIALS[state.mediumOne].soundSpeedMps
    );
    const metrics = field ? field.metrics : Physics.estimateMetrics(state, null);
    const baseHz = 432;
    const modeAHz = baseHz * (1 + mode.m / 24);
    const modeBHz = baseHz * (1 + mode.n / 24);
    const reflectionHz = baseHz * (1.5 + metrics.intensityReflectance * 0.5);
    return {
      sampleRate: 48000,
      durationSeconds: 12,
      baseHz,
      modeAHz,
      modeBHz,
      reflectionHz,
      envelopeHz: state.envelopeHz,
      dutyCycle: state.dutyCycle,
      focusRatio: field ? field.focusRatio : 1,
      modeOverlap: field ? field.modeOverlap : 0,
      intensityReflectance: metrics.intensityReflectance,
      pan: Math.max(-0.8, Math.min(0.8, state.focusXmm / (state.fieldWidthMm / 2))),
      phaseOffset: state.goldenStrength * Math.PI,
      mapping: "ultrasound carrier omitted; field parameters mapped around A4=432 Hz"
    };
  }

  function createOscillator(audioContext, destination, frequency, gainValue, type, pan) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = gainValue;
    oscillator.connect(gain);
    if (audioContext.createStereoPanner) {
      const panner = audioContext.createStereoPanner();
      panner.pan.value = pan;
      gain.connect(panner);
      panner.connect(destination);
      activeNodes.push(panner);
    } else {
      gain.connect(destination);
    }
    oscillator.start();
    activeNodes.push(oscillator, gain);
    return { oscillator, gain };
  }

  async function start(inputState, field) {
    stop();
    const AudioContextClass = global.AudioContext || global.webkitAudioContext;
    if (!AudioContextClass) throw new Error("Web Audio is unavailable in this browser.");
    context = context || new AudioContextClass();
    if (context.state === "suspended") await context.resume();

    const parameters = audioParameters(inputState, field);
    const master = context.createGain();
    const filter = context.createBiquadFilter();
    const compressor = context.createDynamicsCompressor();
    const now = context.currentTime;

    filter.type = "lowpass";
    filter.frequency.value = 2400;
    filter.Q.value = 0.7;
    compressor.threshold.value = -18;
    compressor.knee.value = 10;
    compressor.ratio.value = 5;
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.13, now + 0.08);
    master.connect(filter);
    filter.connect(compressor);
    compressor.connect(context.destination);

    createOscillator(context, master, parameters.baseHz, 0.48, "sine", parameters.pan * 0.45);
    createOscillator(context, master, parameters.modeAHz, 0.17 + parameters.modeOverlap * 0.08, "triangle", -0.38);
    createOscillator(context, master, parameters.modeBHz, 0.15 + parameters.focusRatio * 0.06, "sine", 0.38);
    createOscillator(context, master, parameters.reflectionHz, 0.03 + parameters.intensityReflectance * 0.13, "sine", -parameters.pan);

    const modulation = context.createOscillator();
    const modulationDepth = context.createGain();
    modulation.type = "sine";
    modulation.frequency.value = parameters.envelopeHz;
    modulationDepth.gain.value = 0.055;
    modulation.connect(modulationDepth);
    modulationDepth.connect(master.gain);
    modulation.start();
    activeNodes.push(master, filter, compressor, modulation, modulationDepth);
    return parameters;
  }

  function stop() {
    if (!activeNodes.length) return;
    const now = context ? context.currentTime : 0;
    activeNodes.forEach((node) => {
      try {
        if (node.gain && typeof node.gain.cancelScheduledValues === "function") {
          node.gain.cancelScheduledValues(now);
          node.gain.setTargetAtTime(0.0001, now, 0.025);
        }
      } catch (_) {
        // A disconnected node is harmless.
      }
    });
    const nodesToStop = activeNodes.slice();
    activeNodes = [];
    global.setTimeout(() => {
      nodesToStop.forEach((node) => {
        try {
          if (typeof node.stop === "function") node.stop();
          if (typeof node.disconnect === "function") node.disconnect();
        } catch (_) {
          // Oscillators may already have stopped.
        }
      });
    }, 120);
  }

  function softPulse(time, frequency, dutyCycle) {
    const phase = (time * frequency) % 1;
    const edge = Math.min(0.08, dutyCycle * 0.35, (1 - dutyCycle) * 0.35);
    if (edge <= 0) return phase < dutyCycle ? 1 : 0;
    if (phase < edge) return 0.5 - 0.5 * Math.cos(Math.PI * phase / edge);
    if (phase < dutyCycle - edge) return 1;
    if (phase < dutyCycle) return 0.5 + 0.5 * Math.cos(Math.PI * (phase - (dutyCycle - edge)) / edge);
    return 0;
  }

  function floatSamples(inputState, field, durationSeconds, sampleRate) {
    const parameters = audioParameters(inputState, field);
    const duration = durationSeconds || parameters.durationSeconds;
    const rate = sampleRate || parameters.sampleRate;
    const frameCount = Math.floor(duration * rate);
    const left = new Float32Array(frameCount);
    const right = new Float32Array(frameCount);
    const fadeFrames = Math.max(1, Math.floor(rate * 0.025));
    const reflectionDelay = Math.max(1, Math.round(rate * (0.006 + parameters.intensityReflectance * 0.018)));

    for (let frame = 0; frame < frameCount; frame += 1) {
      const time = frame / rate;
      const pulse = softPulse(time, parameters.envelopeHz, parameters.dutyCycle);
      const slowEnvelope = 0.58 + 0.42 * Math.sin(Physics.TWO_PI * parameters.envelopeHz * time - Math.PI / 2);
      const carrier = Math.sin(Physics.TWO_PI * parameters.baseHz * time + parameters.phaseOffset) * 0.48;
      const modeA = Math.sin(Physics.TWO_PI * parameters.modeAHz * time) * (0.16 + parameters.modeOverlap * 0.10);
      const modeB = Math.sin(Physics.TWO_PI * parameters.modeBHz * time + Math.PI / 2) * (0.14 + parameters.focusRatio * 0.08);
      const texture = Math.sin(Physics.TWO_PI * parameters.reflectionHz * time + parameters.phaseOffset * 0.5) *
        parameters.intensityReflectance * 0.20;
      let signal = (carrier + modeA + modeB + texture) * (0.32 + 0.68 * pulse) * (0.72 + 0.28 * slowEnvelope);
      signal *= 0.58;

      let fade = 1;
      if (frame < fadeFrames) fade = frame / fadeFrames;
      if (frame >= frameCount - fadeFrames) fade = Math.max(0, (frameCount - frame - 1) / fadeFrames);
      signal *= fade;

      const leftGain = Math.sqrt((1 - parameters.pan) / 2);
      const rightGain = Math.sqrt((1 + parameters.pan) / 2);
      left[frame] = signal * leftGain;
      right[frame] = signal * rightGain;
      if (frame >= reflectionDelay) {
        left[frame] += right[frame - reflectionDelay] * parameters.intensityReflectance * 0.18;
        right[frame] += left[frame - reflectionDelay] * parameters.intensityReflectance * 0.18;
      }
    }
    return { left, right, sampleRate: rate, parameters };
  }

  function writeAscii(view, offset, text) {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
  }

  function encodeWav(samples) {
    const channels = 2;
    const bytesPerSample = 2;
    const frameCount = samples.left.length;
    const dataBytes = frameCount * channels * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataBytes);
    const view = new DataView(buffer);
    writeAscii(view, 0, "RIFF");
    view.setUint32(4, 36 + dataBytes, true);
    writeAscii(view, 8, "WAVE");
    writeAscii(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, samples.sampleRate, true);
    view.setUint32(28, samples.sampleRate * channels * bytesPerSample, true);
    view.setUint16(32, channels * bytesPerSample, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeAscii(view, 36, "data");
    view.setUint32(40, dataBytes, true);

    let offset = 44;
    for (let frame = 0; frame < frameCount; frame += 1) {
      const left = Math.max(-1, Math.min(1, samples.left[frame]));
      const right = Math.max(-1, Math.min(1, samples.right[frame]));
      view.setInt16(offset, Math.round(left * 32767), true);
      view.setInt16(offset + 2, Math.round(right * 32767), true);
      offset += 4;
    }
    return new Uint8Array(buffer);
  }

  function renderWav(inputState, field, durationSeconds) {
    const samples = floatSamples(inputState, field, durationSeconds || 12, 48000);
    return { bytes: encodeWav(samples), parameters: samples.parameters };
  }

  function downloadWav(inputState, field) {
    const rendered = renderWav(inputState, field, 12);
    const fingerprint = Physics.fingerprintState(inputState);
    const blob = new Blob([rendered.bytes], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${fingerprint}-heterodyne.wav`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    global.setTimeout(() => URL.revokeObjectURL(url), 5000);
    return rendered.parameters;
  }

  const api = Object.freeze({
    audioParameters,
    start,
    stop,
    softPulse,
    floatSamples,
    encodeWav,
    renderWav,
    downloadWav
  });

  global.TASAudio = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
}(typeof globalThis !== "undefined" ? globalThis : this));
