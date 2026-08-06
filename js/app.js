(function runTASWorkbench(global) {
  "use strict";

  const Physics = global.TASPhysics;
  const Audio = global.TASAudio;
  if (!Physics || !Audio) throw new Error("TAS modules failed to load.");

  const MAX_IMPORT_BYTES = 1024 * 1024;

  const byId = (id) => document.getElementById(id);
  const canvas = byId("field-canvas");
  const context = canvas.getContext("2d", { alpha: false });
  const fieldBuffer = document.createElement("canvas");
  const fieldBufferContext = fieldBuffer.getContext("2d", { alpha: false });

  const controls = {
    elements: byId("elements-input"),
    frequencyMHz: byId("frequency-input"),
    apertureMm: byId("aperture-input"),
    referencePressureMpa: byId("pressure-input"),
    dutyPercent: byId("duty-input"),
    envelopeHz: byId("envelope-input"),
    focusXmm: byId("focus-x-input"),
    focusZmm: byId("focus-z-input"),
    steeringDeg: byId("steering-input"),
    phaseLaw: byId("phase-select"),
    goldenStrength: byId("golden-input"),
    mediumOne: byId("medium-one-select"),
    mediumTwo: byId("medium-two-select"),
    interfaceDepthMm: byId("interface-input"),
    includeReflection: byId("reflection-input"),
    modeRank: byId("mode-rank-input"),
    modeOverlay: byId("mode-overlay-input")
  };

  const outputs = {
    elements: byId("elements-output"),
    frequencyMHz: byId("frequency-output"),
    apertureMm: byId("aperture-output"),
    referencePressureMpa: byId("pressure-output"),
    dutyPercent: byId("duty-output"),
    envelopeHz: byId("envelope-output"),
    focusXmm: byId("focus-x-output"),
    focusZmm: byId("focus-z-output"),
    steeringDeg: byId("steering-output"),
    goldenStrength: byId("golden-output"),
    interfaceDepthMm: byId("interface-output"),
    modeRank: byId("mode-rank-output")
  };

  const claims = {
    "phased-array": {
      classification: "ESTABLISHED ENGINEERING",
      title: "Phased arrays can focus and steer ultrasound",
      body: [
        "Element-specific phase delays can make pressure contributions arrive coherently at a target. Time-reversal and model-derived phase correction can compensate for some heterogeneous paths.",
        "TAS implements a linear 2D phasor sum and a straight-ray heterogeneous-delay proxy. It is useful for intuition, not treatment planning."
      ],
      sourceLabel: "Gâteau et al. — experimental focusing through an ex vivo human skull",
      source: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3081822/"
    },
    "mode-conversion": {
      classification: "ESTABLISHED PHENOMENON / UNSUPPORTED TAS MECHANISM",
      title: "Ultrasound can generate shear waves; a universal 90° Jitterbug flip is not established",
      body: [
        "Acoustic radiation force is routinely used to generate transverse shear waves for elastography. Elastic-wave mode conversion can also occur at interfaces under material- and angle-dependent boundary conditions.",
        "That evidence does not establish the paper's claimed topology-driven 90° phase operator or zero-loss conversion. TAS therefore reports impedance reflection while leaving elastic shear conversion unsolved."
      ],
      sourceLabel: "Sarvazyan et al. — shear wave elasticity imaging",
      source: "https://pubmed.ncbi.nlm.nih.gov/9974896/"
    },
    piezo: {
      classification: "EXPERIMENTAL BIOPHYSICS",
      title: "Ultrasound responses involving PIEZO1 have been observed in specific models",
      body: [
        "Cell and animal experiments report ultrasound-linked PIEZO1 activation or a contribution to neuromodulatory effects.",
        "Those results do not demonstrate that a TAS field directs stem-cell migration, reconstructs tissue topology, or produces regeneration in humans. PIEZO2, TRPV4, and YAP/TAZ require separate evidence."
      ],
      sourceLabel: "Zhu et al. (2023) — PIEZO1 and ultrasound neuromodulation",
      source: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10161134/"
    },
    angle: {
      classification: "UNSUBSTANTIATED TAS CLAIM",
      title: "No universal 55.17° zero-reflection angle is defined by the source model",
      body: [
        "Reflection and transmission depend on acoustic impedances, incidence angle, wave type, and—where solids are involved—elastic properties. White Paper 83 supplies the value 55.17° but no boundary-value derivation that makes reflection vanish across arbitrary tissues.",
        "The water bond angle of about 104.5° does not by itself derive 55.17°. The preset keeps the claimed angle testable; it does not endorse it."
      ],
      sourceLabel: "Source claim: AMENRA S-DMT White Paper 83, sections 2–5",
      source: "docs/CLAIMS.md#c4-universal-5517-striction-angle-and-zero-reflection"
    },
    l39: {
      classification: "UNDEFINED IN SOURCE / EXPLICIT PROXY HERE",
      title: "An eigenmode needs a domain, operator, materials, and boundary conditions",
      body: [
        "White Paper 83 names an L39 biological eigenmode without defining the eigenproblem. A rank alone cannot determine a unique field or frequency.",
        "TAS resolves L39 as the 39th scalar Dirichlet mode of the declared 120 × 120 mm rectangular cavity. Change the geometry or boundary condition and the mode changes."
      ],
      sourceLabel: "See the TAS mathematical model and claim audit",
      source: "docs/MODEL.md#modal-target"
    },
    refresh: {
      classification: "UNSUBSTANTIATED TAS CLAIM",
      title: "A 1 Hz envelope is a controllable parameter, not a regenerative constant",
      body: [
        "The source identifies a 1 Hz “Mass Gap” with heartbeat synchronisation and predicts scaffold collapse within three seconds when interrupted. No derivation, physiological timing model, or supporting experiment is provided.",
        "TAS exposes envelope frequency and duty cycle so 1 Hz can be compared against controls rather than hard-coded as truth."
      ],
      sourceLabel: "Source claim: AMENRA S-DMT White Paper 83, sections 2, 5 and 7",
      source: "docs/CLAIMS.md#c6-1-hz-refresh-regeneration-and-three-second-collapse"
    },
    exposure: {
      classification: "SCREENING METRIC — NOT DOSIMETRY",
      title: "What the displayed Mechanical Index proxy means",
      body: [
        "The displayed value uses derated target pressure divided by the square root of carrier frequency in MHz. It applies the FDA's conventional 0.3 dB·cm⁻¹·MHz⁻¹ derating rule to the declared target depth.",
        "A standards-compliant output calculation requires calibrated acoustic measurements and the spatial-peak pressure location. TAS lacks hydrophone data, nonlinear harmonics, 3D field maxima, thermal modelling, and subject-specific propagation. A low displayed value is not a safety clearance."
      ],
      sourceLabel: "FDA — Marketing Clearance of Diagnostic Ultrasound Systems and Transducers",
      source: "https://www.fda.gov/media/71100/download"
    }
  };

  let state = Physics.sanitizeState(Physics.DEFAULT_STATE);
  let field = null;
  let solveTimer = 0;
  let animationFrame = 0;
  let animationStart = 0;
  let animating = false;
  let listening = false;
  let lastPlot = null;

  function readState() {
    state = Physics.sanitizeState(Object.assign({}, state, {
      elements: controls.elements.value,
      frequencyMHz: controls.frequencyMHz.value,
      apertureMm: controls.apertureMm.value,
      referencePressureMpa: controls.referencePressureMpa.value,
      dutyCycle: Number(controls.dutyPercent.value) / 100,
      envelopeHz: controls.envelopeHz.value,
      focusXmm: controls.focusXmm.value,
      focusZmm: controls.focusZmm.value,
      steeringDeg: controls.steeringDeg.value,
      phaseLaw: controls.phaseLaw.value,
      goldenStrength: controls.goldenStrength.value,
      mediumOne: controls.mediumOne.value,
      mediumTwo: controls.mediumTwo.value,
      interfaceDepthMm: controls.interfaceDepthMm.value,
      includeReflection: controls.includeReflection.checked,
      modeRank: controls.modeRank.value,
      modeOverlay: controls.modeOverlay.checked
    }));
    return state;
  }

  function setControls(nextState) {
    state = Physics.sanitizeState(nextState);
    controls.elements.value = state.elements;
    controls.frequencyMHz.value = state.frequencyMHz;
    controls.apertureMm.value = state.apertureMm;
    controls.referencePressureMpa.value = state.referencePressureMpa;
    controls.dutyPercent.value = Math.round(state.dutyCycle * 100);
    controls.envelopeHz.value = state.envelopeHz;
    controls.focusXmm.value = state.focusXmm;
    controls.focusZmm.value = state.focusZmm;
    controls.steeringDeg.value = state.steeringDeg;
    controls.phaseLaw.value = state.phaseLaw;
    controls.goldenStrength.value = state.goldenStrength;
    controls.mediumOne.value = state.mediumOne;
    controls.mediumTwo.value = state.mediumTwo;
    controls.interfaceDepthMm.value = state.interfaceDepthMm;
    controls.includeReflection.checked = state.includeReflection;
    controls.modeRank.value = state.modeRank;
    controls.modeOverlay.checked = state.modeOverlay;
    updateOutputLabels();
  }

  function signed(value, decimals) {
    const number = Number(value);
    if (Math.abs(number) < Math.pow(10, -decimals) / 2) return (0).toFixed(decimals);
    return `${number > 0 ? "+" : ""}${number.toFixed(decimals)}`;
  }

  function updateOutputLabels() {
    outputs.elements.value = state.elements;
    outputs.elements.textContent = state.elements;
    outputs.frequencyMHz.value = state.frequencyMHz;
    outputs.frequencyMHz.textContent = `${state.frequencyMHz.toFixed(2)} MHz`;
    outputs.apertureMm.value = state.apertureMm;
    outputs.apertureMm.textContent = `${state.apertureMm.toFixed(0)} mm`;
    outputs.referencePressureMpa.value = state.referencePressureMpa;
    outputs.referencePressureMpa.textContent = `${state.referencePressureMpa.toFixed(2)} MPa`;
    outputs.dutyPercent.value = state.dutyCycle * 100;
    outputs.dutyPercent.textContent = `${Math.round(state.dutyCycle * 100)}%`;
    outputs.envelopeHz.value = state.envelopeHz;
    outputs.envelopeHz.textContent = `${state.envelopeHz.toFixed(2)} Hz`;
    outputs.focusXmm.value = state.focusXmm;
    outputs.focusXmm.textContent = `${signed(state.focusXmm, 0)} mm`;
    outputs.focusZmm.value = state.focusZmm;
    outputs.focusZmm.textContent = `${state.focusZmm.toFixed(0)} mm`;
    outputs.steeringDeg.value = state.steeringDeg;
    outputs.steeringDeg.textContent = `${signed(state.steeringDeg, 2)}°`;
    outputs.goldenStrength.value = state.goldenStrength;
    outputs.goldenStrength.textContent = `${state.goldenStrength.toFixed(2)} turns`;
    outputs.interfaceDepthMm.value = state.interfaceDepthMm;
    outputs.interfaceDepthMm.textContent = `${state.interfaceDepthMm.toFixed(0)} mm`;
    outputs.modeRank.value = state.modeRank;
    outputs.modeRank.textContent = `L${state.modeRank}`;
    byId("fingerprint").textContent = Physics.fingerprintState(state).replace("tas-", "");
  }

  function scheduleSolve() {
    readState();
    updateOutputLabels();
    global.clearTimeout(solveTimer);
    byId("computing-indicator").classList.add("visible");
    solveTimer = global.setTimeout(solve, 55);
  }

  function solve() {
    try {
      field = Physics.computeField(state);
      renderMetrics();
      renderField(performance.now());
    } finally {
      byId("computing-indicator").classList.remove("visible");
    }
  }

  function formatFrequency(value) {
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MHz`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)} kHz`;
    return `${value.toFixed(1)} Hz`;
  }

  function formatEngineeringFrequency(value) {
    const units = [
      [1e18, "EHz"],
      [1e15, "PHz"],
      [1e12, "THz"],
      [1e9, "GHz"],
      [1e6, "MHz"],
      [1e3, "kHz"]
    ];
    for (const unit of units) {
      if (Math.abs(value) >= unit[0]) return `${(value / unit[0]).toPrecision(3)} ${unit[1]}`;
    }
    return `${value.toPrecision(3)} Hz`;
  }

  function updateSdmtAudit() {
    const index = Number(byId("sdmt-tissue-select").value);
    const row = Physics.auditClaimedTissueBands()[index];
    const nearestRatio = Math.min(
      Math.max(row.inverseOctaveRatioToClaim, 1 / row.inverseOctaveRatioToClaim),
      Math.max(row.musicTreeRatioToClaim, 1 / row.musicTreeRatioToClaim)
    );
    byId("sdmt-claimed").textContent = `${formatEngineeringFrequency(row.minHz)}–${formatEngineeringFrequency(row.maxHz)}`;
    byId("sdmt-cascade").textContent = formatEngineeringFrequency(row.inverseOctaveHz);
    byId("sdmt-tree").textContent = formatEngineeringFrequency(row.musicTreeHz);
    byId("sdmt-ratio").textContent = `×${nearestRatio.toExponential(2)}`;
    byId("sdmt-verdict").textContent = row.matchesWithoutAdditionalNormalization
      ? "Printed cascade lands inside the claimed band"
      : "Additional normalization required";
  }

  function setBar(id, value) {
    byId(id).style.width = `${Math.max(0, Math.min(100, value * 100))}%`;
  }

  function renderMetrics() {
    if (!field) return;
    const metrics = field.metrics;
    byId("wavelength-metric").innerHTML = `${metrics.wavelengthMm.toFixed(2)} <small>mm</small>`;
    byId("focus-ratio-metric").textContent = field.focusRatio.toFixed(3);
    byId("overlap-metric").textContent = field.modeOverlap.toFixed(3);
    byId("reflectance-metric").textContent = `${(metrics.intensityReflectance * 100).toFixed(1)}%`;
    setBar("wavelength-bar", Math.min(1, metrics.samplesPerWavelengthX / 8));
    setBar("focus-ratio-bar", field.focusRatio);
    setBar("overlap-bar", field.modeOverlap);
    setBar("reflectance-bar", metrics.intensityReflectance);

    byId("mi-metric").textContent = metrics.mechanicalIndexProxy.toFixed(2);
    byId("derated-pressure-metric").textContent = `${metrics.deratedPressureMpa.toFixed(3)} MPa`;
    byId("ispta-metric").textContent = `${metrics.isptaProxyWcm2.toFixed(3)} W/cm²`;
    byId("mi-gauge").style.setProperty("--value", Math.min(1, metrics.mechanicalIndexProxy / 1.9));
    byId("model-status").textContent = metrics.gridAdequateForDisplay ? "LINEAR · DISPLAY GRID" : "GRID UNDERSAMPLED";
    byId("model-status").title = metrics.gridAdequateForDisplay
      ? `${metrics.samplesPerWavelengthX.toFixed(1)} × ${metrics.samplesPerWavelengthZ.toFixed(1)} display samples per wavelength`
      : "The display grid has fewer than four samples per wavelength. This phasor view is visually under-resolved.";

    byId("mode-pair").textContent = `(${field.mode.m}, ${field.mode.n})`;
    byId("mode-frequency").textContent = formatFrequency(field.mode.frequencyHz);
    const warning = byId("exposure-warning");
    warning.querySelector("b").textContent = metrics.mechanicalIndexProxy > 1.9
      ? "MI proxy exceeds the 1.9 reference context"
      : "Incomplete dosimetry";
  }

  function hexToColor(hex) {
    const normalized = hex.replace("#", "");
    return [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16)
    ];
  }

  function mixColor(firstHex, secondHex, amount) {
    const first = hexToColor(firstHex);
    const second = hexToColor(secondHex);
    const t = Math.max(0, Math.min(1, amount));
    return [
      Math.round(first[0] + (second[0] - first[0]) * t),
      Math.round(first[1] + (second[1] - first[1]) * t),
      Math.round(first[2] + (second[2] - first[2]) * t)
    ];
  }

  function sequentialColor(value) {
    const v = Math.max(0, Math.min(1, value));
    if (v < 0.32) return mixColor("#040a0f", "#12596a", v / 0.32);
    if (v < 0.72) return mixColor("#12596a", "#d4aa52", (v - 0.32) / 0.40);
    return mixColor("#d4aa52", "#fff1ba", (v - 0.72) / 0.28);
  }

  function signedColor(value) {
    const v = Math.max(-1, Math.min(1, value));
    return v < 0
      ? mixColor("#071119", "#51c9d4", -v)
      : mixColor("#071119", "#f0cc70", v);
  }

  function phaseColor(value) {
    const unit = (value + Math.PI) / Physics.TWO_PI;
    if (unit < 0.5) return mixColor("#d9b75d", "#071119", unit * 2);
    return mixColor("#071119", "#63d4de", (unit - 0.5) * 2);
  }

  function fieldValue(index, timeMs) {
    switch (state.view) {
      case "intensity": return field.amplitude[index] * field.amplitude[index];
      case "phase": return field.phase[index];
      case "instantaneous": {
        const displayPhase = timeMs * 0.0038 * Physics.TWO_PI;
        return field.real[index] * Math.cos(displayPhase) + field.imaginary[index] * Math.sin(displayPhase);
      }
      case "target": return field.target[index];
      case "error": return field.error[index];
      case "amplitude":
      default: return field.amplitude[index];
    }
  }

  function updateFieldBuffer(timeMs) {
    fieldBuffer.width = field.width;
    fieldBuffer.height = field.height;
    const image = fieldBufferContext.createImageData(field.width, field.height);
    for (let index = 0; index < field.width * field.height; index += 1) {
      const value = fieldValue(index, timeMs);
      let color;
      if (state.view === "phase") color = phaseColor(value);
      else if (state.view === "instantaneous") color = signedColor(value);
      else if (state.view === "error") color = mixColor("#071119", "#e28b6f", Math.min(1, value));
      else color = sequentialColor(value);
      const offset = index * 4;
      image.data[offset] = color[0];
      image.data[offset + 1] = color[1];
      image.data[offset + 2] = color[2];
      image.data[offset + 3] = 255;
    }
    fieldBufferContext.putImageData(image, 0, 0);
  }

  function resizeCanvas() {
    const rectangle = canvas.getBoundingClientRect();
    const ratio = Math.min(2, global.devicePixelRatio || 1);
    const width = Math.max(320, Math.round(rectangle.width * ratio));
    const height = Math.max(300, Math.round(rectangle.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width: width / ratio, height: height / ratio };
  }

  function mapX(xMm, plot) {
    return plot.x + (xMm + state.fieldWidthMm / 2) / state.fieldWidthMm * plot.width;
  }

  function mapZ(zMm, plot) {
    return plot.y + zMm / state.fieldDepthMm * plot.height;
  }

  function drawAxes(plot) {
    context.save();
    context.strokeStyle = "#2a465066";
    context.fillStyle = "#71878d";
    context.lineWidth = 1;
    context.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textAlign = "center";
    context.textBaseline = "top";
    const horizontalTicks = 6;
    for (let tick = 0; tick <= horizontalTicks; tick += 1) {
      const x = plot.x + tick / horizontalTicks * plot.width;
      const value = -state.fieldWidthMm / 2 + tick / horizontalTicks * state.fieldWidthMm;
      context.beginPath();
      context.moveTo(x, plot.y);
      context.lineTo(x, plot.y + plot.height);
      context.stroke();
      context.fillText(value.toFixed(0), x, plot.y + plot.height + 8);
    }
    context.textAlign = "right";
    context.textBaseline = "middle";
    const verticalTicks = 6;
    for (let tick = 0; tick <= verticalTicks; tick += 1) {
      const y = plot.y + tick / verticalTicks * plot.height;
      const value = tick / verticalTicks * state.fieldDepthMm;
      context.beginPath();
      context.moveTo(plot.x, y);
      context.lineTo(plot.x + plot.width, y);
      context.stroke();
      context.fillText(value.toFixed(0), plot.x - 8, y);
    }
    context.fillStyle = "#9cb0b5";
    context.textAlign = "center";
    context.textBaseline = "bottom";
    context.fillText("LATERAL POSITION x (mm)", plot.x + plot.width / 2, plot.y + plot.height + 34);
    context.save();
    context.translate(13, plot.y + plot.height / 2);
    context.rotate(-Math.PI / 2);
    context.fillText("DEPTH z (mm)", 0, 0);
    context.restore();
    context.restore();
  }

  function drawInterface(plot) {
    const y = mapZ(state.interfaceDepthMm, plot);
    const first = Physics.MATERIALS[state.mediumOne];
    const second = Physics.MATERIALS[state.mediumTwo];
    context.save();
    context.setLineDash([5, 4]);
    context.strokeStyle = "#e9c979cc";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(plot.x, y);
    context.lineTo(plot.x + plot.width, y);
    context.stroke();
    context.setLineDash([]);
    context.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.fillStyle = "#f4e1a7";
    context.textAlign = "right";
    context.fillText(`${first.label.toUpperCase()} / ${second.label.toUpperCase()} · ${state.interfaceDepthMm.toFixed(0)} mm`, plot.x + plot.width - 7, y - 7);
    context.restore();
  }

  function drawModeOverlay(plot) {
    if (!state.modeOverlay || !field) return;
    context.save();
    context.setLineDash([2, 5]);
    context.strokeStyle = "#d8f3f455";
    context.lineWidth = 1;
    for (let index = 1; index < field.mode.m; index += 1) {
      const x = plot.x + index / field.mode.m * plot.width;
      context.beginPath();
      context.moveTo(x, plot.y);
      context.lineTo(x, plot.y + plot.height);
      context.stroke();
    }
    for (let index = 1; index < field.mode.n; index += 1) {
      const y = plot.y + index / field.mode.n * plot.height;
      context.beginPath();
      context.moveTo(plot.x, y);
      context.lineTo(plot.x + plot.width, y);
      context.stroke();
    }
    context.restore();
  }

  function drawArray(plot) {
    context.save();
    context.lineWidth = 1;
    field.elementPositionsMm.forEach((position, index) => {
      const x = mapX(position, plot);
      const normalizedPhase = (field.elementPhasesRad[index] + Math.PI) / Physics.TWO_PI;
      context.fillStyle = normalizedPhase > 0.5 ? "#72d7df" : "#e9c979";
      context.fillRect(x - 2, plot.y - 9, 4, 7);
    });
    context.strokeStyle = "#94aeb4";
    context.beginPath();
    context.moveTo(mapX(-state.apertureMm / 2, plot), plot.y - 12);
    context.lineTo(mapX(state.apertureMm / 2, plot), plot.y - 12);
    context.stroke();
    context.fillStyle = "#9cb0b5";
    context.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textAlign = "left";
    context.fillText(`${state.elements} ELEMENT ARRAY`, plot.x, plot.y - 17);
    context.restore();
  }

  function drawFocus(plot) {
    const x = mapX(state.focusXmm, plot);
    const y = mapZ(state.focusZmm, plot);
    context.save();
    context.strokeStyle = "#fff1ba";
    context.fillStyle = "#fff1ba";
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(x, y, 8, 0, Physics.TWO_PI);
    context.stroke();
    context.beginPath();
    context.moveTo(x - 13, y);
    context.lineTo(x + 13, y);
    context.moveTo(x, y - 13);
    context.lineTo(x, y + 13);
    context.stroke();
    context.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textAlign = x > plot.x + plot.width * 0.7 ? "right" : "left";
    context.fillText(`TARGET ${signed(state.focusXmm, 0)}, ${state.focusZmm.toFixed(0)} mm`, x + (context.textAlign === "left" ? 16 : -16), y - 8);
    context.restore();
  }

  function drawSteering(plot) {
    if (Math.abs(state.steeringDeg) < 0.01) return;
    const startX = mapX(0, plot);
    const startY = plot.y;
    const length = Math.min(state.focusZmm, state.fieldDepthMm * 0.7);
    const angle = state.steeringDeg * Math.PI / 180;
    const endXmm = Math.tan(angle) * length;
    context.save();
    context.strokeStyle = "#e9c97999";
    context.setLineDash([7, 5]);
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(mapX(endXmm, plot), mapZ(length, plot));
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "#f4e1a7";
    context.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.fillText(`${state.steeringDeg.toFixed(2)}° DECLARED STEERING`, startX + 8, startY + 18);
    context.restore();
  }

  function renderField(timeMs) {
    if (!field) return;
    const size = resizeCanvas();
    const plot = {
      x: 47,
      y: 34,
      width: Math.max(100, size.width - 68),
      height: Math.max(100, size.height - 79)
    };
    lastPlot = plot;
    context.fillStyle = "#03080c";
    context.fillRect(0, 0, size.width, size.height);
    updateFieldBuffer(timeMs || 0);
    context.imageSmoothingEnabled = true;
    context.drawImage(fieldBuffer, plot.x, plot.y, plot.width, plot.height);
    context.strokeStyle = "#35535c";
    context.strokeRect(plot.x - 0.5, plot.y - 0.5, plot.width + 1, plot.height + 1);
    drawAxes(plot);
    drawModeOverlay(plot);
    drawInterface(plot);
    drawSteering(plot);
    drawArray(plot);
    drawFocus(plot);
  }

  function animate(timeMs) {
    if (!animating) return;
    if (!animationStart) animationStart = timeMs;
    renderField(timeMs - animationStart);
    animationFrame = global.requestAnimationFrame(animate);
  }

  function updateAnimationButton(button) {
    byId("animate-icon").textContent = animating ? "■" : "▶";
    byId("animate-label").textContent = animating ? "Stop field" : "Animate field";
    button.setAttribute("aria-pressed", animating ? "true" : "false");
  }

  function preserveScrollAfterUpdate(update) {
    const scrollX = global.scrollX;
    const scrollY = global.scrollY;
    update();
    global.requestAnimationFrame(() => {
      if (Math.abs(global.scrollX - scrollX) <= 1 && Math.abs(global.scrollY - scrollY) <= 1) return;
      const root = document.documentElement;
      const previousBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      global.scrollTo(scrollX, scrollY);
      root.style.scrollBehavior = previousBehavior;
    });
  }

  function toggleAnimation() {
    const button = byId("animate-button");
    preserveScrollAfterUpdate(() => {
      animating = !animating;
      if (animating) {
        setView("instantaneous");
        animationStart = 0;
        animationFrame = global.requestAnimationFrame(animate);
      } else {
        global.cancelAnimationFrame(animationFrame);
        renderField(performance.now());
      }
      updateAnimationButton(button);
      button.focus({ preventScroll: true });
    });
  }

  async function toggleAudio() {
    const button = byId("listen-button");
    if (listening) {
      Audio.stop();
      listening = false;
      button.innerHTML = "<span aria-hidden=\"true\">◉</span> Listen to mapping";
      return;
    }
    try {
      await Audio.start(state, field);
      listening = true;
      button.innerHTML = "<span aria-hidden=\"true\">■</span> Stop mapping";
    } catch (error) {
      openInformation("Audio unavailable", [error.message], "", "");
    }
  }

  function flashButton(button, message, milliseconds) {
    const original = button.textContent;
    button.textContent = message;
    button.disabled = true;
    global.setTimeout(() => {
      button.textContent = original;
      button.disabled = false;
    }, milliseconds || 1100);
  }

  function renderWav() {
    const button = byId("wav-button");
    Audio.downloadWav(state, field);
    flashButton(button, "WAV SAVED", 1300);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    global.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function exportExperiment() {
    const record = Physics.createExperimentRecord(state, field);
    const json = Physics.canonicalJSON(record, 2) + "\n";
    downloadBlob(new Blob([json], { type: "application/json" }), `${record.fingerprint}.json`);
    flashButton(byId("export-button"), "JSON SAVED", 1300);
  }

  function importExperiment(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      openInformation("Import failed", ["TAS experiment files must be 1 MB or smaller."], "", "");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const importedState = parsed.simulation || parsed.state || parsed;
        setControls(importedState);
        byId("preset-select").value = "reference";
        scheduleSolve();
      } catch (error) {
        openInformation("Import failed", ["The selected file is not a valid TAS experiment JSON document.", error.message], "", "");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function replaceParagraphs(element, paragraphs) {
    const nodes = paragraphs.map((paragraph) => {
      const node = document.createElement("p");
      node.textContent = paragraph;
      return node;
    });
    element.replaceChildren(...nodes);
  }

  function replaceSourceLink(element, label, source) {
    if (!source) {
      element.replaceChildren();
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = source;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = label || source;
    element.replaceChildren(anchor);
  }

  function openInformation(title, paragraphs, sourceLabel, source) {
    const dialog = byId("claim-dialog");
    byId("dialog-classification").textContent = "TAS WORKBENCH";
    byId("dialog-title").textContent = title;
    replaceParagraphs(byId("dialog-body"), paragraphs);
    replaceSourceLink(byId("dialog-source"), sourceLabel, source);
    dialog.showModal();
  }

  function openClaim(key) {
    const claim = claims[key];
    if (!claim) return;
    const dialog = byId("claim-dialog");
    byId("dialog-classification").textContent = claim.classification;
    byId("dialog-title").textContent = claim.title;
    replaceParagraphs(byId("dialog-body"), claim.body);
    replaceSourceLink(byId("dialog-source"), claim.sourceLabel, claim.source);
    dialog.showModal();
  }

  function setView(view) {
    state.view = view;
    document.querySelectorAll(".view-tab").forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    const labels = {
      amplitude: ["antinodal", "node"],
      intensity: ["high", "low"],
      phase: ["+π", "−π"],
      instantaneous: ["compression", "rarefaction"],
      target: ["target antinode", "target node"],
      error: ["high error", "matched"]
    };
    byId("legend-high").textContent = labels[view][0];
    byId("legend-low").textContent = labels[view][1];
    if (!animating || view !== "instantaneous") renderField(performance.now());
  }

  function canvasCoordinates(event) {
    if (!lastPlot || !field) return null;
    const rectangle = canvas.getBoundingClientRect();
    const xCanvas = event.clientX - rectangle.left;
    const yCanvas = event.clientY - rectangle.top;
    if (
      xCanvas < lastPlot.x || xCanvas > lastPlot.x + lastPlot.width ||
      yCanvas < lastPlot.y || yCanvas > lastPlot.y + lastPlot.height
    ) return null;
    const xUnit = (xCanvas - lastPlot.x) / lastPlot.width;
    const zUnit = (yCanvas - lastPlot.y) / lastPlot.height;
    const xMm = xUnit * state.fieldWidthMm - state.fieldWidthMm / 2;
    const zMm = zUnit * state.fieldDepthMm;
    const column = Math.max(0, Math.min(field.width - 1, Math.round(xUnit * (field.width - 1))));
    const row = Math.max(0, Math.min(field.height - 1, Math.round(zUnit * (field.height - 1))));
    return { xMm, zMm, index: row * field.width + column };
  }

  function updateCursor(event) {
    const point = canvasCoordinates(event);
    if (!point) return;
    byId("cursor-readout").textContent = `x ${signed(point.xMm, 1)} · z ${point.zMm.toFixed(1)} mm`;
    byId("field-readout").textContent = `|p| ${field.amplitude[point.index].toFixed(3)} · φ ${field.phase[point.index].toFixed(2)} rad`;
  }

  function moveFocus(event) {
    const point = canvasCoordinates(event);
    if (!point) return;
    state.focusXmm = Math.round(Math.max(-45, Math.min(45, point.xMm)));
    state.focusZmm = Math.round(Math.max(15, Math.min(110, point.zMm)));
    setControls(state);
    scheduleSolve();
  }

  function bindEvents() {
    Object.values(controls).forEach((control) => {
      control.addEventListener("input", scheduleSolve);
      control.addEventListener("change", scheduleSolve);
    });

    byId("preset-select").addEventListener("change", (event) => {
      setControls(Physics.applyPreset(event.target.value, Physics.DEFAULT_STATE));
      scheduleSolve();
    });
    byId("sdmt-tissue-select").addEventListener("change", updateSdmtAudit);
    byId("reset-button").addEventListener("click", () => {
      byId("preset-select").value = "reference";
      setControls(Physics.DEFAULT_STATE);
      scheduleSolve();
    });
    document.querySelectorAll(".panel-toggle").forEach((button) => {
      button.addEventListener("click", () => {
        const expanded = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", expanded ? "false" : "true");
        const content = byId(button.getAttribute("aria-controls"));
        content.hidden = expanded;
        button.querySelector("i").textContent = expanded ? "+" : "−";
      });
    });
    document.querySelectorAll(".view-tab").forEach((button) => {
      button.addEventListener("click", () => setView(button.dataset.view));
    });
    document.querySelectorAll("[data-claim]").forEach((button) => {
      button.addEventListener("click", () => openClaim(button.dataset.claim));
    });
    byId("exposure-info").addEventListener("click", () => openClaim("exposure"));
    byId("ledger-button").addEventListener("click", () => global.open("docs/CLAIMS.md", "_blank", "noopener"));
    byId("animate-button").addEventListener("click", toggleAnimation);
    byId("listen-button").addEventListener("click", toggleAudio);
    byId("wav-button").addEventListener("click", renderWav);
    byId("export-button").addEventListener("click", exportExperiment);
    byId("import-input").addEventListener("change", importExperiment);
    canvas.addEventListener("pointermove", updateCursor);
    canvas.addEventListener("click", moveFocus);
    global.addEventListener("resize", () => renderField(performance.now()));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && listening) {
        Audio.stop();
        listening = false;
        byId("listen-button").innerHTML = "<span aria-hidden=\"true\">◉</span> Listen to mapping";
      }
    });
  }

  function init() {
    setControls(state);
    bindEvents();
    updateSdmtAudit();
    setView("amplitude");
    solve();
  }

  init();
}(window));
