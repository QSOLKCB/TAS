# TAS non-clinical safety boundary

## Plain-language boundary

TAS is a browser-based research simulator. It cannot tell anyone that an ultrasound exposure is safe, effective, correctly targeted, or suitable for a person or animal.

Do not use TAS values to build or operate an exposure system on living subjects.

## Prohibited interpretations

The workbench must not be presented as:

- a medical device or medical-device prototype ready for use;
- a diagnostic, therapeutic, regenerative, rehabilitation, or cosmetic system;
- a substitute for an ultrasound physicist, biomedical engineer, clinician, ethics committee, or regulator;
- a standards-compliant Mechanical Index, Thermal Index, thermal dose, or cavitation calculation;
- evidence that `L39`, the Golden Cross, a 55.17° angle, a 1 Hz refresh, water memory, or a golden phase mask has biological efficacy;
- permission to expose a human, animal, cell culture, organoid, tissue sample, implant, or medical device; or
- proof that a low displayed number is safe.

## Why the simulation is insufficient for exposure decisions

### The pressure field is relative

The heat map is normalised to its largest displayed phasor magnitude. The “reference pressure” is supplied by the user and is not linked to a calibrated transducer transfer function or hydrophone measurement.

### Important propagation physics is absent

- three-dimensional aperture and anatomy;
- element directivity, impulse response, matching layers, coupling, and drive electronics;
- refraction solved from an actual material map;
- multiple scattering and reverberation;
- nonlinear propagation and harmonic generation;
- elastic longitudinal and shear modes;
- frequency-dependent dispersion and anisotropy;
- skull, gas, calcification, implants, contrast agents, and interfaces not represented by the two-layer phantom; and
- uncertainty propagation.

### Important bioeffects are absent

- temperature rise and cumulative equivalent minutes at 43°C;
- thermal conduction and blood perfusion;
- stable and inertial cavitation;
- radiation-force displacement and stress;
- vascular, neural, immune, and cellular response;
- subject-specific susceptibility and disease state;
- exposure repetition, scan path, and off-target maxima; and
- delayed effects.

### The displayed MI is only a proxy

TAS computes

$$
MI_{\mathrm{proxy}}=p_{r.3}^{\mathrm{proxy}}/\sqrt{f_{\mathrm{MHz}}}
$$

using a user-declared reference pressure and the conventional 0.3 dB·cm⁻¹·MHz⁻¹ derating rule at the declared focus. A standards-compliant Mechanical Index uses calibrated acoustic output quantities and a defined spatial-peak location. TAS does not have those measurements.

The UI shows a 1.9 comparison context because it is widely encountered in diagnostic and transcranial-ultrasound guidance. It is not a universal threshold, does not cover every mechanism or subject, and cannot be transferred to the proposed regenerative application as a safety rule.

### TAS does not calculate Thermal Index

The correct display is **not solved**. TAS will not invent a temperature or Thermal Index from pressure alone.

## Responsible research sequence

### Gate 1 — reproducible specification

Before hardware:

- define the intended acoustic forward problem;
- define every source equation, unit, parameter, boundary condition, and target;
- publish reference inputs and outputs;
- preregister which outcome would falsify each TAS-specific claim; and
- separate conventional acoustic predictions from genuinely novel ones.

### Gate 2 — calibrated free-field characterisation

With qualified ultrasound personnel and suitable equipment:

- measure element output and phase response in a water tank;
- map the 3D pressure field with a calibrated hydrophone;
- report carrier, pulse waveform, pulse duration, pulse repetition frequency, duty cycle, burst count, exposure duration, and drive voltage;
- report free-field peak negative pressure, pulse-average and temporal-average intensities, focal dimensions, sidelobes, and uncertainty; and
- compare measurements against the numerical model before adding complex materials.

### Gate 3 — inert phantoms

- use tissue-mimicking phantoms with measured properties;
- validate attenuation, reflection, refraction, focal shift, and off-target maxima;
- use thermometry and displacement measurement appropriate to the hypotheses;
- compare 55.17° against angle sweeps rather than a single preferred angle;
- compare 1 Hz against energy-matched timing controls; and
- compare golden/L39 phases against conventional optimisation and randomised phases.

### Gate 4 — biological work

Biological work is a new project, not a checkbox after simulation. It requires suitably qualified investigators, documented risk analysis, facilities, ethics and biosafety approvals, preregistration, blinded controls, viability/damage endpoints, statistical design, and independent oversight.

No human or animal exposure should be inferred from this repository.

## Reporting baseline

Any future low-intensity transcranial ultrasound work should, where applicable, use the ITRUSST reporting checklist: transducer and drive system, drive settings, free-field parameters, pulse timing, in situ estimates, and intensity quantities. Its safety consensus informs risk assessment but does not replace regulation or ethics review.

- [ITRUSST standardised reporting consensus](https://pubmed.ncbi.nlm.nih.gov/38670224/)
- [ITRUSST biophysical safety consensus preprint](https://arxiv.org/abs/2311.05359)
- [FDA diagnostic-ultrasound system guidance and acoustic-output definitions](https://www.fda.gov/media/71100/download)
- [FDA ultrasound imaging information](https://www.fda.gov/radiation-emitting-products/medical-imaging/ultrasound-imaging)

## Software issue reporting

If TAS displays a value that could be mistaken for clinical advice, silently changes units, accepts a non-finite number, produces non-deterministic results, or fails to preserve a limitation in export, treat that as a safety-relevant software defect and open an issue.

Security vulnerabilities should be reported privately through GitHub's repository security advisory mechanism rather than a public issue.
