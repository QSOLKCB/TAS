# TAS — Topological Acoustic Stylus Research Workbench

**An offline, deterministic acoustic-field simulator and claim-audit instrument.**

[Open the workbench](https://qsolkcb.github.io/TAS/) · [Read the model](docs/MODEL.md) · [Inspect the claim ledger](docs/CLAIMS.md) · [Safety boundary](docs/SAFETY.md)

> [!CAUTION]
> **Not a medical device.** TAS is not a treatment planner, exposure calculator, diagnostic system, or evidence that the proposed therapy works. Do not use its output on people or animals.

## What this repository does

Robert Dumont's AMENRA S-DMT White Paper 83 proposes a “Topological Acoustic Stylus”: a phased-array ultrasound system intended to form acoustic patterns in tissue. The proposal combines established acoustic engineering with speculative geometric and biological claims.

This repository turns that proposal into two things that can be tested:

1. an executable, dependency-free model of a **declared** two-layer acoustic phantom; and
2. an explicit ledger separating established physics, experimental biology, undefined mathematics, and unsupported therapeutic claims.

The workbench does not silently convert an evocative diagram into fake precision. Where the source leaves a variable, operator, boundary condition, or calibration undefined, TAS says so and uses a named proxy only when that proxy is useful.

## Workbench features

- 4–64 element linear phased array
- homogeneous focusing, steered plane-wave, heterogeneous straight-ray delay, and golden-phase perturbation modes
- two-layer water / soft-tissue / fat / muscle / cortical-bone proxies
- frequency-dependent attenuation and first-order interface reflection
- pressure amplitude, intensity, phase, slowed wave, modal target, and field-error views
- explicit 2D rectangular mode resolver, including a reproducible interpretation of `L39`
- live wavelength, focal ratio, modal overlap, reflectance, MI screening proxy, and intensity proxy
- numerical audit of the White Paper 83 frequency equations against its tissue table
- deterministic JSON experiment records and fingerprints
- 432 Hz heterodyned parameter sonification with offline WAV rendering
- no package manager, server, framework, CDN, cookies, analytics, or network calls

## Run it

Download the repository and open `index.html` in a modern browser. ES modules are deliberately not used, so the lab works from `file://` without a local server.

For a conventional local URL, an optional static server also works:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## What the model actually solves

The visual field is a linear frequency-domain scalar proxy:

$$
\tilde p(x,z)=\sum_{j=1}^{N}
\frac{a_j T(x,z)e^{-A_j(x,z)}}{\sqrt{r_j}}
e^{i[\Phi_j(x,z)+\phi_j]}.
$$

It includes element phase, distance spreading, layer-dependent attenuation, a straight-line two-medium travel-time approximation, and an optional first reflected path. It does **not** solve nonlinear acoustics, 3D anatomy, elastic shear conversion, refraction, heat transfer, perfusion, cavitation, or cell behaviour. See [docs/MODEL.md](docs/MODEL.md) for every equation and assumption.

## The `L39` interpretation

White Paper 83 does not define an eigenproblem for `L39`. An eigenmode requires at least a domain, operator, material field, and boundary conditions.

TAS therefore declares its own falsifiable interpretation: `L39` is the 39th eigenvalue-ranked mode of a 2D rectangular scalar cavity with Dirichlet boundaries. The workbench shows the resolved mode pair and frequency. This is a mathematical comparison target—not a biological eigenmode.

## Source-equation audit

The paper supplies:

$$
\gamma=\frac{\sqrt 5}{13},\quad
\beta=11.653,\quad
C=\frac{1}{\sqrt 2},\quad
f_0=1\ \mathrm{Hz},
$$

$$
f_{n,m}=f_0\,\beta^{(n-1)C}\left(\frac{3}{2}\right)^{m-1},
\qquad
f_k\approx 8^{39-k}\ \mathrm{Hz}.
$$

Using the printed values literally, neither frequency expression reproduces the paper's four tissue-frequency bands without an additional normalization or mapping. TAS calculates the discrepancy live and exports it in every experiment record. This is a repairable specification gap, not a value to conceal.

## Evidence boundary

| Source idea | Current classification | TAS treatment |
|---|---|---|
| Phased-array focusing | Established engineering | Implemented as a linear phasor model |
| Heterogeneous phase correction | Established in principle | Straight-ray approximation, labelled as such |
| Ultrasound-generated shear waves | Established by radiation-force elastography | Elastic conversion is not simulated |
| PIEZO1 response to ultrasound | Experimental, model-dependent | Documented; no regeneration inference |
| Universal 55.17° zero-reflection angle | Unsupported by a boundary derivation | Preserved as a test preset |
| Biological `L39` eigenmode | Undefined | Replaced by an explicit rectangular-cavity proxy |
| 1 Hz regenerative refresh | Unsupported | Exposed as a variable and control condition |
| Water memory / geometric phase storage | Unsupported | Excluded from the physics model |
| Directed human tissue regeneration | Unproven | No efficacy output exists |

The complete, source-by-source analysis is in [docs/CLAIMS.md](docs/CLAIMS.md).

## Exposure display

The Mechanical Index value is an educational screening proxy using the conventional 0.3 dB·cm⁻¹·MHz⁻¹ derating rule. It is not standards-compliant dosimetry and a low value is not a safety clearance. Temperature is deliberately shown as **not solved**.

Any genuine prototype programme must begin with calibrated free-field measurements and inert phantoms, follow recognised ultrasound reporting and safety standards, and obtain the required ethics and regulatory approvals before biological exposure. See [docs/SAFETY.md](docs/SAFETY.md).

## Determinism and exports

Simulation-critical inputs are canonicalised with sorted JSON keys and fingerprinted with FNV-1a. The same TAS version and experiment state produce the same field arrays, phase delays, metrics, audit values, and fingerprint.

An exported record includes:

- all declared inputs;
- element positions, phases, and phase-equivalent delays;
- field and exposure proxies;
- the selected modal eigenpair;
- S-DMT constants and tissue-band consistency audit;
- the model description and limitations; and
- a deterministic fingerprint.

## Tests

No install step is required.

```sh
node --test tests/*.test.cjs
node --check js/physics.js
node --check js/audio.js
node --check js/app.js
python3 tests/static_check.py
```

The GitHub Actions workflow runs the same checks without building or transforming the static site.

## Repository map

```text
index.html                 Offline workbench
styles.css                 Interface and responsive layout
js/physics.js              Deterministic acoustic and S-DMT audit model
js/audio.js                Web Audio mapping and WAV encoder
js/app.js                  Controls, canvas renderer, import/export
docs/MODEL.md              Equations, assumptions, and numerical limits
docs/CLAIMS.md             Evidence and falsifiability ledger
docs/SAFETY.md             Non-clinical use boundary
docs/SOURCES.md            Primary and authoritative sources
presets/                   Portable example experiment states
source/                    Supplied concept documents and provenance
tests/                     Physics, determinism, WAV, and static checks
```

## Provenance and credit

- Original TAS / AMENRA S-DMT concept: **Robert Dumont (Voltardark)** and the named AMENRA S-DMT collective
- Research translation, implementation, evidence boundary, and sonification: **Trent Slade / QSOL-IMC**
- White Paper 83 and the supplied slide deck are preserved under [`source/`](source/) for auditability; their inclusion does not imply scientific validation.

## License

Code and original TAS workbench documentation are licensed under [MPL-2.0](LICENSE). Supplied source documents remain attributable to their original authors and are included for research review and provenance.
