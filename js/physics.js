(function attachTASPhysics(global) {
  "use strict";

  const VERSION = "0.1.0";
  const TWO_PI = Math.PI * 2;
  const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

  const MATERIALS = Object.freeze({
    water: Object.freeze({
      label: "Water",
      soundSpeedMps: 1480,
      densityKgM3: 998,
      attenuationDbCmMHz: 0.002,
      provenance: "representative value"
    }),
    soft: Object.freeze({
      label: "Generic soft tissue",
      soundSpeedMps: 1540,
      densityKgM3: 1000,
      attenuationDbCmMHz: 0.50,
      provenance: "declared generic proxy"
    }),
    fat: Object.freeze({
      label: "Fat",
      soundSpeedMps: 1450,
      densityKgM3: 920,
      attenuationDbCmMHz: 0.60,
      provenance: "representative value"
    }),
    muscle: Object.freeze({
      label: "Muscle",
      soundSpeedMps: 1580,
      densityKgM3: 1060,
      attenuationDbCmMHz: 1.00,
      provenance: "representative value; anisotropy omitted"
    }),
    bone: Object.freeze({
      label: "Cortical bone proxy",
      soundSpeedMps: 3500,
      densityKgM3: 1900,
      attenuationDbCmMHz: 8.00,
      provenance: "coarse scalar proxy; elastic modes omitted"
    })
  });

  const SDMT = Object.freeze({
    gamma: Math.sqrt(5) / 13,
    strictionAngleDeg: 55.17,
    beta: 11.653,
    C: 1 / Math.sqrt(2),
    massGapHz: 1,
    latticeLabel: "L39 Golden Cross",
    source: "AMENRA S-DMT White Paper 83 (August 2026)"
  });

  const DEFAULT_STATE = Object.freeze({
    elements: 24,
    frequencyMHz: 0.50,
    apertureMm: 80,
    referencePressureMpa: 0.30,
    dutyCycle: 0.20,
    envelopeHz: 1.00,
    focusXmm: 0,
    focusZmm: 58,
    steeringDeg: 0,
    phaseLaw: "focus",
    goldenStrength: 0,
    mediumOne: "soft",
    mediumTwo: "muscle",
    interfaceDepthMm: 38,
    includeReflection: true,
    modeRank: 39,
    modeOverlay: true,
    view: "amplitude",
    fieldWidthMm: 120,
    fieldDepthMm: 120,
    gridWidth: 180,
    gridHeight: 180
  });

  const PRESETS = Object.freeze({
    reference: Object.freeze({}),
    "tas-l39": Object.freeze({
      frequencyMHz: 0.50,
      focusZmm: 62,
      steeringDeg: SDMT.strictionAngleDeg,
      phaseLaw: "golden",
      goldenStrength: 0.39,
      envelopeHz: SDMT.massGapHz,
      modeRank: 39,
      mediumOne: "soft",
      mediumTwo: "muscle",
      interfaceDepthMm: 42
    }),
    interface: Object.freeze({
      frequencyMHz: 0.80,
      focusXmm: 0,
      focusZmm: 74,
      steeringDeg: 35,
      phaseLaw: "focus",
      goldenStrength: 0,
      mediumOne: "soft",
      mediumTwo: "bone",
      interfaceDepthMm: 48,
      includeReflection: true
    }),
    "time-reversal": Object.freeze({
      elements: 40,
      frequencyMHz: 0.65,
      apertureMm: 110,
      focusXmm: 18,
      focusZmm: 82,
      steeringDeg: 0,
      phaseLaw: "heterogeneous",
      goldenStrength: 0,
      mediumOne: "fat",
      mediumTwo: "muscle",
      interfaceDepthMm: 32
    })
  });

  const CLAIMED_TISSUE_BANDS = Object.freeze([
    Object.freeze({ tissue: "Bone / cartilage", k: 18, minHz: 1e6, maxHz: 5e6 }),
    Object.freeze({ tissue: "Muscle", k: 25, minHz: 0.5e6, maxHz: 2e6 }),
    Object.freeze({ tissue: "Fascia / tendon", k: 30, minHz: 0.1e6, maxHz: 0.5e6 }),
    Object.freeze({ tissue: "Epidermis / dermis", k: 35, minHz: 20e3, maxHz: 100e3 })
  ]);

  const SIMULATION_KEYS = Object.freeze([
    "elements", "frequencyMHz", "apertureMm", "referencePressureMpa",
    "dutyCycle", "envelopeHz", "focusXmm", "focusZmm", "steeringDeg",
    "phaseLaw", "goldenStrength", "mediumOne", "mediumTwo",
    "interfaceDepthMm", "includeReflection", "modeRank", "fieldWidthMm",
    "fieldDepthMm", "gridWidth", "gridHeight"
  ]);

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function allowed(value, options, fallback) {
    return options.includes(value) ? value : fallback;
  }

  function sanitizeState(input) {
    const state = Object.assign({}, DEFAULT_STATE, input || {});
    return {
      elements: Math.round(clamp(finiteNumber(state.elements, DEFAULT_STATE.elements), 4, 64) / 2) * 2,
      frequencyMHz: clamp(finiteNumber(state.frequencyMHz, DEFAULT_STATE.frequencyMHz), 0.10, 3.00),
      apertureMm: clamp(finiteNumber(state.apertureMm, DEFAULT_STATE.apertureMm), 20, 140),
      referencePressureMpa: clamp(finiteNumber(state.referencePressureMpa, DEFAULT_STATE.referencePressureMpa), 0.001, 10),
      dutyCycle: clamp(finiteNumber(state.dutyCycle, DEFAULT_STATE.dutyCycle), 0.001, 1),
      envelopeHz: clamp(finiteNumber(state.envelopeHz, DEFAULT_STATE.envelopeHz), 0.10, 20),
      focusXmm: clamp(finiteNumber(state.focusXmm, DEFAULT_STATE.focusXmm), -55, 55),
      focusZmm: clamp(finiteNumber(state.focusZmm, DEFAULT_STATE.focusZmm), 5, 120),
      steeringDeg: clamp(finiteNumber(state.steeringDeg, DEFAULT_STATE.steeringDeg), -70, 70),
      phaseLaw: allowed(state.phaseLaw, ["focus", "heterogeneous", "plane", "golden"], DEFAULT_STATE.phaseLaw),
      goldenStrength: clamp(finiteNumber(state.goldenStrength, DEFAULT_STATE.goldenStrength), 0, 1),
      mediumOne: allowed(state.mediumOne, Object.keys(MATERIALS), DEFAULT_STATE.mediumOne),
      mediumTwo: allowed(state.mediumTwo, Object.keys(MATERIALS), DEFAULT_STATE.mediumTwo),
      interfaceDepthMm: clamp(finiteNumber(state.interfaceDepthMm, DEFAULT_STATE.interfaceDepthMm), 1, 119),
      includeReflection: Boolean(state.includeReflection),
      modeRank: Math.round(clamp(finiteNumber(state.modeRank, DEFAULT_STATE.modeRank), 1, 96)),
      modeOverlay: state.modeOverlay !== false,
      view: allowed(state.view, ["amplitude", "intensity", "phase", "instantaneous", "target", "error"], DEFAULT_STATE.view),
      fieldWidthMm: clamp(finiteNumber(state.fieldWidthMm, DEFAULT_STATE.fieldWidthMm), 40, 300),
      fieldDepthMm: clamp(finiteNumber(state.fieldDepthMm, DEFAULT_STATE.fieldDepthMm), 40, 300),
      gridWidth: Math.round(clamp(finiteNumber(state.gridWidth, DEFAULT_STATE.gridWidth), 40, 360)),
      gridHeight: Math.round(clamp(finiteNumber(state.gridHeight, DEFAULT_STATE.gridHeight), 40, 240))
    };
  }

  function applyPreset(name, currentState) {
    const preset = PRESETS[name] || PRESETS.reference;
    return sanitizeState(Object.assign({}, DEFAULT_STATE, currentState || {}, preset));
  }

  function acousticImpedance(material) {
    return material.densityKgM3 * material.soundSpeedMps;
  }

  function normalIncidenceCoefficients(first, second) {
    const z1 = acousticImpedance(first);
    const z2 = acousticImpedance(second);
    const pressureReflection = (z2 - z1) / (z2 + z1);
    const pressureTransmission = (2 * z2) / (z2 + z1);
    const intensityReflection = pressureReflection * pressureReflection;
    const intensityTransmission = (4 * z1 * z2) / ((z1 + z2) * (z1 + z2));
    return {
      impedanceOneRayl: z1,
      impedanceTwoRayl: z2,
      pressureReflection,
      pressureTransmission,
      intensityReflection,
      intensityTransmission
    };
  }

  function wavelengthMm(frequencyMHz, soundSpeedMps) {
    return soundSpeedMps / (frequencyMHz * 1e6) * 1000;
  }

  function elementPositions(state) {
    if (state.elements === 1) return [0];
    const step = state.apertureMm / (state.elements - 1);
    return Array.from({ length: state.elements }, (_, index) => -state.apertureMm / 2 + step * index);
  }

  function wrapPhase(radians) {
    let phase = radians % TWO_PI;
    if (phase > Math.PI) phase -= TWO_PI;
    if (phase < -Math.PI) phase += TWO_PI;
    return phase;
  }

  function splitPathLengths(xElementMm, xMm, zMm, interfaceDepthMm) {
    const dx = xMm - xElementMm;
    const distanceMm = Math.hypot(dx, zMm);
    if (zMm <= interfaceDepthMm || zMm <= 0) {
      return { distanceMm, upperMm: distanceMm, lowerMm: 0 };
    }
    const upperFraction = clamp(interfaceDepthMm / zMm, 0, 1);
    const upperMm = distanceMm * upperFraction;
    return { distanceMm, upperMm, lowerMm: distanceMm - upperMm };
  }

  function pathPhaseRadians(xElementMm, xMm, zMm, state, heterogeneous) {
    const first = MATERIALS[state.mediumOne];
    const second = MATERIALS[state.mediumTwo];
    const omega = TWO_PI * state.frequencyMHz * 1e6;
    const path = splitPathLengths(xElementMm, xMm, zMm, state.interfaceDepthMm);
    if (!heterogeneous) {
      return omega * (path.distanceMm / 1000) / first.soundSpeedMps;
    }
    return omega * (
      (path.upperMm / 1000) / first.soundSpeedMps +
      (path.lowerMm / 1000) / second.soundSpeedMps
    );
  }

  function pathAttenuation(xElementMm, xMm, zMm, state) {
    const first = MATERIALS[state.mediumOne];
    const second = MATERIALS[state.mediumTwo];
    const path = splitPathLengths(xElementMm, xMm, zMm, state.interfaceDepthMm);
    const attenuationDb = state.frequencyMHz * (
      first.attenuationDbCmMHz * path.upperMm / 10 +
      second.attenuationDbCmMHz * path.lowerMm / 10
    );
    return Math.pow(10, -attenuationDb / 20);
  }

  function calculateElementPhases(inputState) {
    const state = sanitizeState(inputState);
    const positions = elementPositions(state);
    const first = MATERIALS[state.mediumOne];
    const kUpper = TWO_PI / wavelengthMm(state.frequencyMHz, first.soundSpeedMps);
    const steeringRadians = state.steeringDeg * Math.PI / 180;
    return positions.map((xElementMm, index) => {
      let phase;
      if (state.phaseLaw === "plane") {
        phase = -kUpper * xElementMm * Math.sin(steeringRadians);
      } else {
        const heterogeneous = state.phaseLaw === "heterogeneous";
        phase = -pathPhaseRadians(
          xElementMm,
          state.focusXmm,
          state.focusZmm,
          state,
          heterogeneous
        );
        phase -= kUpper * xElementMm * Math.sin(steeringRadians);
        if (state.phaseLaw === "golden") {
          const goldenTurn = ((index + 1) / GOLDEN_RATIO) % 1;
          phase += state.goldenStrength * TWO_PI * goldenTurn;
        }
      }
      return wrapPhase(phase);
    });
  }

  function hannApodization(index, count) {
    if (count <= 1) return 1;
    return 0.08 + 0.92 * (0.5 - 0.5 * Math.cos(TWO_PI * index / (count - 1)));
  }

  function resolveRectangularMode(rank, widthMm, depthMm, soundSpeedMps) {
    const modes = [];
    const maximumIndex = 24;
    for (let m = 1; m <= maximumIndex; m += 1) {
      for (let n = 1; n <= maximumIndex; n += 1) {
        const eigenvalue = Math.pow(m / widthMm, 2) + Math.pow(n / depthMm, 2);
        modes.push({ m, n, eigenvalue });
      }
    }
    modes.sort((a, b) => a.eigenvalue - b.eigenvalue || a.m - b.m || a.n - b.n);
    const selected = modes[clamp(Math.round(rank), 1, modes.length) - 1];
    const frequencyHz = soundSpeedMps / 2 * Math.sqrt(
      Math.pow(selected.m / (widthMm / 1000), 2) +
      Math.pow(selected.n / (depthMm / 1000), 2)
    );
    return Object.assign({ rank: Math.round(rank), frequencyHz }, selected);
  }

  function targetModeValue(xMm, zMm, mode, widthMm, depthMm) {
    const xUnit = clamp((xMm + widthMm / 2) / widthMm, 0, 1);
    const zUnit = clamp(zMm / depthMm, 0, 1);
    return Math.abs(Math.sin(mode.m * Math.PI * xUnit) * Math.sin(mode.n * Math.PI * zUnit));
  }

  function locateNearestIndex(value, minimum, maximum, count) {
    const unit = clamp((value - minimum) / (maximum - minimum), 0, 1);
    return Math.round(unit * (count - 1));
  }

  function contiguousWidth(profile, center, threshold, sampleSpacingMm) {
    if (!profile.length) return 0;
    let peakIndex = clamp(center, 0, profile.length - 1);
    const searchRadius = Math.max(3, Math.round(profile.length * 0.12));
    for (let index = Math.max(0, center - searchRadius); index <= Math.min(profile.length - 1, center + searchRadius); index += 1) {
      if (profile[index] > profile[peakIndex]) peakIndex = index;
    }
    const cutoff = profile[peakIndex] * threshold;
    let left = peakIndex;
    let right = peakIndex;
    while (left > 0 && profile[left] >= cutoff) left -= 1;
    while (right < profile.length - 1 && profile[right] >= cutoff) right += 1;
    return Math.max(0, (right - left - 1) * sampleSpacingMm);
  }

  function computeField(inputState) {
    const state = sanitizeState(inputState);
    const width = state.gridWidth;
    const height = state.gridHeight;
    const total = width * height;
    const real = new Float64Array(total);
    const imaginary = new Float64Array(total);
    const amplitude = new Float64Array(total);
    const phase = new Float64Array(total);
    const target = new Float64Array(total);
    const error = new Float64Array(total);
    const positions = elementPositions(state);
    const phases = calculateElementPhases(state);
    const first = MATERIALS[state.mediumOne];
    const second = MATERIALS[state.mediumTwo];
    const coefficients = normalIncidenceCoefficients(first, second);
    const kUpper = TWO_PI / wavelengthMm(state.frequencyMHz, first.soundSpeedMps);
    const dxMm = state.fieldWidthMm / (width - 1);
    const dzMm = state.fieldDepthMm / (height - 1);
    const mode = resolveRectangularMode(state.modeRank, state.fieldWidthMm, state.fieldDepthMm, first.soundSpeedMps);
    let maximumAmplitude = 0;

    for (let yIndex = 0; yIndex < height; yIndex += 1) {
      const zMm = Math.max(0.2, yIndex * dzMm);
      for (let xIndex = 0; xIndex < width; xIndex += 1) {
        const xMm = -state.fieldWidthMm / 2 + xIndex * dxMm;
        let re = 0;
        let im = 0;

        for (let elementIndex = 0; elementIndex < positions.length; elementIndex += 1) {
          const elementX = positions[elementIndex];
          const directPath = splitPathLengths(elementX, xMm, zMm, state.interfaceDepthMm);
          const propagationPhase = pathPhaseRadians(elementX, xMm, zMm, state, true) + phases[elementIndex];
          const attenuation = pathAttenuation(elementX, xMm, zMm, state);
          const spreading = 1 / Math.sqrt(Math.max(1, directPath.distanceMm));
          const apodization = hannApodization(elementIndex, positions.length);
          const transmission = zMm > state.interfaceDepthMm ? coefficients.pressureTransmission : 1;
          const directAmplitude = attenuation * spreading * apodization * transmission;

          re += directAmplitude * Math.cos(propagationPhase);
          im += directAmplitude * Math.sin(propagationPhase);

          if (state.includeReflection && zMm < state.interfaceDepthMm) {
            const reflectedDepthMm = 2 * state.interfaceDepthMm - zMm;
            const reflectedDistanceMm = Math.hypot(xMm - elementX, reflectedDepthMm);
            const reflectedAttenuationDb = first.attenuationDbCmMHz * state.frequencyMHz * reflectedDistanceMm / 10;
            const reflectedAttenuation = Math.pow(10, -reflectedAttenuationDb / 20);
            const reflectedAmplitude = coefficients.pressureReflection * reflectedAttenuation * apodization /
              Math.sqrt(Math.max(1, reflectedDistanceMm));
            const reflectedPhase = kUpper * reflectedDistanceMm + phases[elementIndex];
            re += reflectedAmplitude * Math.cos(reflectedPhase);
            im += reflectedAmplitude * Math.sin(reflectedPhase);
          }
        }

        const index = yIndex * width + xIndex;
        real[index] = re;
        imaginary[index] = im;
        amplitude[index] = Math.hypot(re, im);
        phase[index] = Math.atan2(im, re);
        target[index] = targetModeValue(xMm, zMm, mode, state.fieldWidthMm, state.fieldDepthMm);
        if (amplitude[index] > maximumAmplitude) maximumAmplitude = amplitude[index];
      }
    }

    const safeMaximum = maximumAmplitude || 1;
    let overlapNumerator = 0;
    let overlapFieldEnergy = 0;
    let overlapTargetEnergy = 0;
    for (let index = 0; index < total; index += 1) {
      amplitude[index] /= safeMaximum;
      real[index] /= safeMaximum;
      imaginary[index] /= safeMaximum;
      error[index] = Math.abs(amplitude[index] - target[index]);
      overlapNumerator += amplitude[index] * target[index];
      overlapFieldEnergy += amplitude[index] * amplitude[index];
      overlapTargetEnergy += target[index] * target[index];
    }

    const focusColumn = locateNearestIndex(state.focusXmm, -state.fieldWidthMm / 2, state.fieldWidthMm / 2, width);
    const focusRow = locateNearestIndex(state.focusZmm, 0, state.fieldDepthMm, height);
    const focusIndex = focusRow * width + focusColumn;
    const lateralProfile = Array.from(amplitude.slice(focusRow * width, (focusRow + 1) * width));
    const axialProfile = Array.from({ length: height }, (_, row) => amplitude[row * width + focusColumn]);
    const halfPowerAmplitude = 1 / Math.sqrt(2);
    const modeOverlap = overlapNumerator / Math.sqrt(overlapFieldEnergy * overlapTargetEnergy || 1);

    const field = {
      state,
      width,
      height,
      dxMm,
      dzMm,
      real,
      imaginary,
      amplitude,
      phase,
      target,
      error,
      elementPositionsMm: positions,
      elementPhasesRad: phases,
      mode,
      maximumRawAmplitude: maximumAmplitude,
      focusIndex,
      focusRatio: amplitude[focusIndex],
      modeOverlap,
      lateralFwhmMm: contiguousWidth(lateralProfile, focusColumn, halfPowerAmplitude, dxMm),
      axialFwhmMm: contiguousWidth(axialProfile, focusRow, halfPowerAmplitude, dzMm),
      coefficients
    };
    field.metrics = estimateMetrics(state, field);
    return field;
  }

  function estimateMetrics(inputState, field) {
    const state = sanitizeState(inputState);
    const first = MATERIALS[state.mediumOne];
    const second = MATERIALS[state.mediumTwo];
    const coefficients = field ? field.coefficients : normalIncidenceCoefficients(first, second);
    const focusRatio = field ? field.focusRatio : 1;
    const depthCm = state.focusZmm / 10;
    const deratingDb = 0.3 * state.frequencyMHz * depthCm;
    const deratedPressureMpa = state.referencePressureMpa * focusRatio * Math.pow(10, -deratingDb / 20);
    const mechanicalIndexProxy = deratedPressureMpa / Math.sqrt(state.frequencyMHz);
    const rmsPressurePa = deratedPressureMpa * 1e6 / Math.sqrt(2);
    const intensityWm2 = rmsPressurePa * rmsPressurePa / (first.densityKgM3 * first.soundSpeedMps);
    const isptaProxyWcm2 = intensityWm2 * state.dutyCycle / 1e4;
    const wavelength = wavelengthMm(state.frequencyMHz, first.soundSpeedMps);
    const gridDx = state.fieldWidthMm / (state.gridWidth - 1);
    const gridDz = state.fieldDepthMm / (state.gridHeight - 1);
    return {
      wavelengthMm: wavelength,
      focusRatio,
      modeOverlap: field ? field.modeOverlap : null,
      intensityReflectance: coefficients.intensityReflection,
      intensityTransmission: coefficients.intensityTransmission,
      pressureReflection: coefficients.pressureReflection,
      pressureTransmission: coefficients.pressureTransmission,
      deratingDb,
      deratedPressureMpa,
      mechanicalIndexProxy,
      isptaProxyWcm2,
      lateralFwhmMm: field ? field.lateralFwhmMm : null,
      axialFwhmMm: field ? field.axialFwhmMm : null,
      samplesPerWavelengthX: wavelength / gridDx,
      samplesPerWavelengthZ: wavelength / gridDz,
      gridAdequateForDisplay: gridDx <= wavelength / 4 && gridDz <= wavelength / 4,
      thermalIndex: null,
      temperatureRiseC: null
    };
  }

  function sdmtFrequencyHz(n, m, f0Hz) {
    const fundamental = finiteNumber(f0Hz, SDMT.massGapHz);
    return fundamental * Math.pow(SDMT.beta, (n - 1) * SDMT.C) * Math.pow(3 / 2, m - 1);
  }

  function sdmtScaleRatio(k, direction) {
    const sign = direction === "inverse" ? -1 : 1;
    return Math.pow(SDMT.beta, sign * (k - 1) * (1 + SDMT.gamma) * SDMT.C);
  }

  function inverseOctaveCascadeHz(k, f0Hz) {
    return finiteNumber(f0Hz, 1) * Math.pow(8, 39 - k);
  }

  function auditClaimedTissueBands() {
    return CLAIMED_TISSUE_BANDS.map((entry) => {
      const cascadeHz = inverseOctaveCascadeHz(entry.k, 1);
      const treeHz = sdmtFrequencyHz(entry.k, 1, 1);
      const geometricMidpointHz = Math.sqrt(entry.minHz * entry.maxHz);
      return Object.assign({}, entry, {
        claimedMidpointHz: geometricMidpointHz,
        inverseOctaveHz: cascadeHz,
        inverseOctaveRatioToClaim: cascadeHz / geometricMidpointHz,
        musicTreeHz: treeHz,
        musicTreeRatioToClaim: treeHz / geometricMidpointHz,
        matchesWithoutAdditionalNormalization: cascadeHz >= entry.minHz && cascadeHz <= entry.maxHz
      });
    });
  }

  function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === "object") {
      const result = {};
      Object.keys(value).sort().forEach((key) => {
        if (value[key] !== undefined) result[key] = canonicalize(value[key]);
      });
      return result;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return Number(value.toPrecision(12));
    }
    return value;
  }

  function canonicalJSON(value, spacing) {
    return JSON.stringify(canonicalize(value), null, spacing || 0);
  }

  function fnv1a(text) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function simulationState(state) {
    const clean = sanitizeState(state);
    return SIMULATION_KEYS.reduce((result, key) => {
      result[key] = clean[key];
      return result;
    }, {});
  }

  function fingerprintState(state) {
    return `tas-${fnv1a(canonicalJSON(simulationState(state)))}`;
  }

  function createExperimentRecord(state, field) {
    const clean = sanitizeState(state);
    const solved = field || computeField(clean);
    const metrics = solved.metrics;
    return {
      schema: "https://qsolkcb.github.io/TAS/schema/experiment-v1.json",
      schemaVersion: 1,
      application: { name: "TAS Acoustic Field Workbench", version: VERSION },
      fingerprint: fingerprintState(clean),
      simulation: simulationState(clean),
      derived: {
        mode: solved.mode,
        metrics,
        elementPositionsMm: solved.elementPositionsMm,
        elementPhasesRad: solved.elementPhasesRad,
        elementDelaysUs: solved.elementPhasesRad.map((phase) => phase / (TWO_PI * clean.frequencyMHz)),
        sdmtConstants: SDMT,
        sdmtTissueBandAudit: auditClaimedTissueBands()
      },
      model: {
        dimensionality: "2D scalar frequency-domain proxy",
        propagation: "linear superposition with straight-ray layered delay",
        boundary: "one horizontal interface; optional first-order reflection",
        modeTarget: "2D rectangular Dirichlet scalar mode",
        audio: "inaudible carrier heterodyned to an audible parameter mapping"
      },
      limitations: [
        "Not a medical device or treatment planner.",
        "No nonlinear propagation, elastic tensor, refraction ray solve, 3D anatomy, skull correction, thermal solve, perfusion, cavitation model, or hydrophone calibration.",
        "Mechanical Index is a screening proxy evaluated at the declared target, not a standards-compliant system output calculation.",
        "Golden-phase perturbation is an explicit deterministic proxy because White Paper 83 does not define the morphology term S_i.",
        "L39 is a declared rectangular mode rank in this workbench, not an established biological eigenmode."
      ]
    };
  }

  const api = Object.freeze({
    VERSION,
    TWO_PI,
    GOLDEN_RATIO,
    MATERIALS,
    SDMT,
    DEFAULT_STATE,
    PRESETS,
    CLAIMED_TISSUE_BANDS,
    sanitizeState,
    applyPreset,
    acousticImpedance,
    normalIncidenceCoefficients,
    wavelengthMm,
    elementPositions,
    wrapPhase,
    splitPathLengths,
    pathPhaseRadians,
    pathAttenuation,
    calculateElementPhases,
    resolveRectangularMode,
    targetModeValue,
    computeField,
    estimateMetrics,
    sdmtFrequencyHz,
    sdmtScaleRatio,
    inverseOctaveCascadeHz,
    auditClaimedTissueBands,
    canonicalJSON,
    fnv1a,
    fingerprintState,
    createExperimentRecord
  });

  global.TASPhysics = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
}(typeof globalThis !== "undefined" ? globalThis : this));
