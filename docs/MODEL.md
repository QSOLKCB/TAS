# TAS model specification

Version: 0.1.0  
Status: non-clinical research simulator  
Implementation: [`js/physics.js`](../js/physics.js)

## 1. Scope

TAS computes a deterministic two-dimensional, linear, frequency-domain scalar pressure proxy produced by a finite linear array. It is designed to answer questions such as:

- What field follows from a declared phase law in a declared phantom?
- How do focus, attenuation, impedance contrast, and an interface change the displayed pattern?
- Does the computed field resemble a separately declared modal target?
- Do the numerical equations printed in White Paper 83 reproduce its tissue-frequency table?

It is not a finite-element model, full-wave time-domain solver, elastic-wave solver, bioheat solver, cell model, treatment planner, or safety calculator.

## 2. Coordinates and units

- $x$: lateral position in millimetres
- $z$: depth in millimetres, increasing away from the array
- linear array: centred on $z=0$
- layer interface: horizontal line $z=z_I$
- frequency $f$: megahertz in the interface, converted to hertz internally
- sound speed $c$: metres per second
- density $\rho$: kilograms per cubic metre
- attenuation $\alpha$: decibels per centimetre per megahertz
- pressure: megapascals for the exposure-context input

The displayed default domain is $120\times120$ mm on a $180\times180$ sample grid. This grid is a display grid for a phasor model, not a validated discretisation for time-domain wave propagation.

## 3. Declared material proxies

| Material | $c$ (m/s) | $\rho$ (kg/m³) | $\alpha$ (dB/cm/MHz) | Important omission |
|---|---:|---:|---:|---|
| Water | 1480 | 998 | 0.002 | temperature dependence |
| Generic soft tissue | 1540 | 1000 | 0.50 | tissue specificity |
| Fat | 1450 | 920 | 0.60 | heterogeneity |
| Muscle | 1580 | 1060 | 1.00 | anisotropy |
| Cortical bone proxy | 3500 | 1900 | 8.00 | elastic tensor, porosity, strong dispersion |

These are representative educational values, not a patient model or authoritative property database. A real model must preserve source, temperature, frequency range, uncertainty, and specimen conditions for every property.

## 4. Array geometry

For $N$ elements across aperture $D$, element centres are equally spaced:

$$
x_j=-\frac{D}{2}+\frac{jD}{N-1},\qquad j=0,\ldots,N-1.
$$

A raised Hann apodisation prevents the edge elements from disappearing completely:

$$
a_j=0.08+0.92\left[\frac12-\frac12\cos\left(\frac{2\pi j}{N-1}\right)\right].
$$

This apodisation is a workbench choice, not a White Paper 83 requirement.

## 5. Propagation phasor

At field point $(x,z)$, TAS sums complex element contributions:

$$
\tilde p(x,z)=\sum_{j=1}^{N}
\frac{a_j\,T(x,z)\,10^{-A_j(x,z)/20}}{\sqrt{\max(r_j,1\ \mathrm{mm})}}
\exp\left(i[\Phi_j(x,z)+\phi_j]\right).
$$

Here:

- $r_j$ is the straight-line element-to-point distance;
- $A_j$ is path attenuation in decibels;
- $T$ is a normal-incidence pressure-transmission proxy below the interface;
- $\Phi_j$ is accumulated propagation phase; and
- $\phi_j$ is the element drive phase.

The $1/\sqrt r$ term is a 2D spreading convention. It is not the $1/r$ spreading of a point source in unbounded 3D space.

The field is normalised to the largest displayed magnitude:

$$
p_N(x,z)=\frac{|\tilde p(x,z)|}{\max_{x,z}|\tilde p(x,z)|}.
$$

Consequently, the heat map shows relative field structure. It does not report calibrated pressure.

## 6. Layered straight-ray approximation

For a point below the interface, the straight path is divided in proportion to interface depth:

$$
r_{1j}=r_j\frac{z_I}{z},\qquad r_{2j}=r_j-r_{1j}.
$$

The propagation phase is

$$
\Phi_j=2\pi f\left(\frac{r_{1j}}{c_1}+\frac{r_{2j}}{c_2}\right),
$$

and attenuation is

$$
A_j=f_{\mathrm{MHz}}
\left(\alpha_1\frac{r_{1j}}{10\ \mathrm{mm/cm}}+
\alpha_2\frac{r_{2j}}{10\ \mathrm{mm/cm}}\right).
$$

This does not solve the refracted Fermat path and therefore does not enforce Snell's law. Diffraction, scattering, multiple reflections, mode conversion, and interface roughness are omitted.

## 7. Interface coefficients

For acoustic impedances $Z_i=\rho_i c_i$, the normal-incidence fluid coefficients are

$$
R_p=\frac{Z_2-Z_1}{Z_2+Z_1},\qquad
T_p=\frac{2Z_2}{Z_2+Z_1},
$$

$$
R_I=R_p^2,\qquad
T_I=\frac{4Z_1Z_2}{(Z_1+Z_2)^2}.
$$

The implementation test requires $R_I+T_I=1$ to numerical tolerance for lossless normal incidence.

When reflection is enabled, one image-source path is added above the interface. This is a first-order visual proxy only. The solid-like bone option still uses this fluid coefficient because the scalar model has no shear degree of freedom.

## 8. Phase laws

### 8.1 Homogeneous focus

For target $(x_f,z_f)$ in upper-medium sound speed $c_1$:

$$
\phi_j=-k_1r_j(x_f,z_f)-k_1x_j\sin\theta,
\qquad k_1=\frac{2\pi f}{c_1}.
$$

The second term is an optional user-declared phase ramp.

### 8.2 Straight-ray heterogeneous delay

The focal phase is the negative of the two-layer travel phase from section 6. This resembles model-derived phase correction, but it is not a measured time-reversal experiment and is not called one in the implementation.

### 8.3 Steered plane wave

$$
\phi_j=-k_1x_j\sin\theta.
$$

### 8.4 Golden-phase perturbation proxy

White Paper 83 states

$$
z_{i+1}=\varphi z_i+S_i,
$$

but does not define the type or initial value of $z_i$, the morphology encoding $S_i$, the conversion from $z_i$ to drive phase, or its normalisation.

TAS therefore does **not** claim to implement that recurrence. It adds a named deterministic proxy to the homogeneous focal law:

$$
\phi_j^{\mathrm{TAS}}=\phi_j^{\mathrm{focus}}+
2\pi q\,\operatorname{frac}\left(\frac{j+1}{\varphi}\right),
$$

where $q\in[0,1]$ is the displayed “Golden perturbation” control. This makes the source idea testable while keeping the substitution visible.

## 9. Modal target

### Why the source `L39` is incomplete

An eigenmode is defined relative to an operator, domain, coefficients, and boundary conditions. White Paper 83 supplies none of these for a biological `L39` mode, and the label does not identify a standard acoustic eigenmode.

### TAS declaration

TAS uses the scalar Dirichlet modes of a rectangular domain of width $W$ and depth $H$:

$$
u_{mn}(x,z)=
\left|\sin\left(m\pi\frac{x+W/2}{W}\right)
\sin\left(n\pi\frac{z}{H}\right)\right|,
$$

$$
f_{mn}=\frac{c_1}{2}
\sqrt{\left(\frac{m}{W}\right)^2+\left(\frac{n}{H}\right)^2}.
$$

Pairs $(m,n)$ are sorted by increasing eigenvalue, with deterministic integer tie-breaking. `L39` means the 39th item in that sorted list. It is a declared comparison surface, not a discovery about tissue.

The displayed overlap is cosine similarity between non-negative field magnitude and target magnitude:

$$
\mathcal O=
\frac{\sum p_Nu_{mn}}
{\sqrt{\sum p_N^2}\sqrt{\sum u_{mn}^2}}.
$$

It is a shape score, not biological efficacy.

## 10. White Paper 83 equation audit

The source declares

$$
\gamma=\frac{\sqrt5}{13},\qquad
\phi_c=55.17^\circ,\qquad
\beta=11.653,\qquad
C=\frac1{\sqrt2},\qquad f_0=1\ \mathrm{Hz},
$$

$$
G(k)=G_0\beta^{\pm(k-1)(1+\gamma)C},
$$

$$
f_{n,m}=f_0\beta^{(n-1)C}\left(\frac32\right)^{m-1},
$$

and, in the tissue section,

$$
f_k\approx8^{39-k}\ \mathrm{Hz}.
$$

TAS implements these expressions literally and compares both $f_{k,1}$ and $8^{39-k}$ with the printed bands. No row lands in its claimed interval without another normalisation or mapping. See [CLAIMS.md](CLAIMS.md#c8-tissue-index-to-frequency-table) for the numerical table.

The angle $55.17^\circ$ is retained as a declared test value. It is not derived from $\gamma$, $\beta$, $C$, the water bond angle, or interface properties in the supplied paper.

## 11. Exposure-context metrics

### Mechanical Index proxy

TAS applies the conventional reference derating rule to the declared target depth:

$$
p_{r.3}^{\mathrm{proxy}}=
p_{\mathrm{ref}}p_N(x_f,z_f)
10^{-0.3f_{\mathrm{MHz}}z_{\mathrm{cm}}/20},
$$

$$
MI_{\mathrm{proxy}}=
\frac{p_{r.3}^{\mathrm{proxy}}\ [\mathrm{MPa}]}
{\sqrt{f_{\mathrm{MHz}}}}.
$$

This is not standards-compliant MI because the reference pressure is user-declared rather than hydrophone-measured, the spatial-peak pulse-intensity-integral location is not identified in calibrated units, and nonlinear propagation is absent.

### Intensity proxy

$$
I_{\mathrm{SPTA}}^{\mathrm{proxy}}=
\frac{(p_{r.3}^{\mathrm{proxy}}/\sqrt2)^2}{\rho_1c_1}
\times \text{duty cycle}.
$$

The interface converts W/m² to W/cm² for display. There is no beam-area integration, hydrophone calibration, pulse waveform, scan sequence, or thermal model.

### Deliberately absent

TAS never manufactures a Thermal Index or temperature rise. Both remain `null` in exported records.

## 12. Audio mapping

The ultrasound carrier lies above human hearing and above a 48 kHz WAV Nyquist frequency. TAS does not pitch-shift a sampled ultrasonic waveform it never calculated. It maps field parameters to an audible model around A4 = 432 Hz:

- 432 Hz: reference carrier for the sonification;
- resolved $(m,n)$: two modal partials;
- envelope frequency and duty cycle: smooth amplitude gating;
- interface reflectance: a quiet delayed texture;
- focus lateral position: stereo position;
- golden perturbation: phase offset.

The WAV is 48 kHz, stereo, 16-bit PCM, 12 seconds, with deterministic samples and short fades.

## 13. Determinism

Simulation-critical state is sanitised, key-sorted, serialised as canonical JSON, and fingerprinted with 32-bit FNV-1a. Display choice and visual overlay state do not affect the fingerprint. The implementation version is exported separately.

FNV-1a provides a compact change detector, not cryptographic integrity or provenance authentication.

## 14. Required next model stages

Before any exposure study, a competent multidisciplinary team would need at minimum:

1. calibrated transducer characterisation in water;
2. a 3D full-wave acoustic model validated against hydrophone scans;
3. subject- or phantom-specific geometry and material uncertainty;
4. elastic propagation if longitudinal-to-shear conversion is a hypothesis;
5. nonlinear and cavitation analysis appropriate to pressure regime;
6. bioheat and perfusion modelling validated by thermometry;
7. preregistered phantom and ex vivo tests with negative and angle controls; and
8. independent safety, ethics, and regulatory review before any in vivo work.
