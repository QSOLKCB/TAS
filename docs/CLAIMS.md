# TAS evidence and falsifiability ledger

Audit target: **AMENRA S-DMT White Paper 83, “The Topological Acoustic Stylus” (August 2026)**  
Audit version: **TAS 0.1.0**  
Purpose: separate an interesting engineering proposal into supported components, incomplete specifications, and falsifiable hypotheses.

## Classification key

| Class | Meaning |
|---|---|
| Established | Reproducible physical/engineering phenomenon with an accepted model in the relevant regime |
| Experimental | Reported in specific research models; scope and translation remain limited |
| Undefined | The source does not supply enough mathematics or parameters to calculate the claim |
| Unsupported | A testable assertion is made without adequate derivation or evidence in the supplied material |
| Contradicted internally | Printed equations, values, or descriptions do not reproduce one another as written |

“Unsupported” does not mean impossible. It means the current evidence does not justify treating the claim as true.

## Summary

| ID | Claim | Classification | TAS disposition |
|---|---|---|---|
| C1 | Phased arrays can focus an ultrasonic field | Established | Implemented |
| C2 | Acoustic phase masks can form complex pressure distributions | Established | Represented by explicit phase laws |
| C3 | Ultrasound can generate shear waves / mode conversion | Established phenomenon; TAS mechanism unsupported | Scalar model stops before shear conversion |
| C4 | 55.17° is a universal striction angle with zero reflection | Unsupported | Preserved as a comparison preset |
| C5 | Ultrasound can activate mechanosensitive channels including PIEZO1 | Experimental and model-dependent | Documented; no efficacy inference |
| C6 | A 1 Hz refresh synchronises biology and preserves a regenerative scaffold | Unsupported | Exposed as a variable |
| C7 | Biological tissue has a unique `L39` eigenmode on a Golden Cross lattice | Undefined | Replaced by a declared rectangular mode proxy |
| C8 | Printed S-DMT scaling equations derive the tissue-frequency table | Internally inconsistent as written | Numerically audited |
| C9 | A golden recurrence yields optimal morphology-specific array phases | Undefined | Named perturbation proxy only |
| C10 | Water stores the required geometric phase information | Unsupported | Excluded |
| C11 | The proposed fields guide stem cells and regenerate tissue | Unsupported / unproven | No biological output exists |
| C12 | The protocol is scale-invariant, parameter-free, and has zero free parameters | Contradicted by its implementation requirements | Every parameter is exported |

## Detailed claims

### C1. Phased-array focusing

**Source claim:** A multi-element ultrasound system applies element-specific delays to create and steer a focal field.

**Assessment:** Established acoustic engineering. Experimental work has demonstrated model-derived and time-reversal focusing through heterogeneous structures, including ex vivo skull and rib configurations. Phase correction quality depends on geometry, material characterisation, frequency, aperture, element response, and validation measurements.

**TAS handling:** Implemented as a linear phasor sum with homogeneous or two-layer straight-ray focal delays. “Heterogeneous delay” is deliberately not labelled measured time reversal.

**What would validate the next stage:** Compare calculated and hydrophone-measured complex pressure fields in water and layered phantoms; report focal shift, −6 dB dimensions, sidelobes, insertion loss, and uncertainty.

Primary examples:

- [Gâteau et al., transcranial ultrasonic therapy based on time reversal of acoustically induced cavitation bubble signature](https://pmc.ncbi.nlm.nih.gov/articles/PMC3081822/)
- [Aubry et al., transcostal high-intensity focused ultrasound and time-reversal rib sparing](https://pmc.ncbi.nlm.nih.gov/articles/PMC3021953/)

### C2. Acoustic holography and complex fields

**Source claim:** Phase-modulated ultrasound can create a 3D network of pressure nodes and antinodes.

**Assessment:** Complex pressure fields and acoustic holograms are established. That does not make a field a persistent biological scaffold, a “Mandelbrot Mold,” or evidence of regeneration. A holographic target must be represented as a numerical complex field, and achieved fields must be measured.

**TAS handling:** Multiple phase laws can be compared against an explicit modal target. TAS calls the result a field, not a scaffold.

**Specification gap:** White Paper 83 cites “University of Fukui (Ueda et al.)” without a title, DOI, year, or URL. That reference cannot presently be verified as the claimed contemporary 3D tissue-relevant result. A 1980 Ueda paper concerns holographic interferometric visualisation of ultrasonic wavefronts, which is not the same claim.

Relevant primary demonstration:

- [Jiménez-Gambín et al., holograms to focus arbitrary ultrasonic fields through the skull](https://arxiv.org/abs/1902.06716)

### C3. Longitudinal-to-shear conversion

**Source claim:** A 90° “Jitterbug” phase rotation at a tissue boundary converts a longitudinal compression wave to a transverse shear wave.

**Assessment:** Shear-wave generation by acoustic radiation force is established and widely used in elastography. Elastic-wave mode conversion can also occur at interfaces, but it follows boundary conditions involving incidence angle, longitudinal and shear speeds, impedances, and polarisation. A universal topological 90° phase operator is not supplied or established by the source.

**TAS handling:** The v0.1 scalar solver reports reflection and transmission but has no shear state. It does not animate a shear wave it has not solved.

**Falsification experiment:** In a calibrated elastic phantom, measure longitudinal and transverse displacement fields across angles and interfaces. Compare a conventional elastodynamic model against a preregistered Jitterbug prediction, including conversion efficiency and phase. A TAS-specific result must outperform the conventional model out of sample.

Primary foundation:

- [Sarvazyan et al., shear wave elasticity imaging: a new ultrasonic technology of medical diagnostics](https://pubmed.ncbi.nlm.nih.gov/9974896/)

### C4. Universal 55.17° striction angle and zero reflection

**Source claim:** At exactly $55.17^\circ$, an ultrasound beam bypasses “thixotropic friction,” and the reflection coefficient becomes zero for the target tissue.

**Assessment:** Unsupported. For fluid-like media, reflection at an interface is determined by impedance and incidence. For elastic solids, longitudinal and shear branches and critical angles enter. A zero-reflection angle can exist only under particular constitutive properties and boundary conditions; it is not universal.

White Paper 83 provides the number but no equation deriving it from $\gamma$, $\beta$, $C$, the water bond angle, or measured tissue parameters. The statement that water's approximately $104.5^\circ$ bond angle is a “macroscopic projection” of $55.17^\circ$ supplies no projection map.

**TAS handling:** The value remains a preset so it can be compared with 45°, normal incidence, the conventional-model optimum, and angle sweeps. It is labelled “declared steering,” not “perfect alignment.”

**Decisive test:** For preregistered material pairs and fixed frequency, sweep incidence angle with a calibrated hydrophone or laser vibrometer. The prediction requires a repeatable reflectance minimum specifically at $55.17^\circ$ after accounting for uncertainty. Testing only the claimed angle is insufficient.

### C5. PIEZO1/2 mechanotransduction

**Source claim:** The proposed shear field activates PIEZO1/2, TRPV4, and YAP/TAZ and thereby guides stem-cell migration.

**Assessment:** Experimental work supports ultrasound-linked activation or involvement of PIEZO1 in particular cell and animal models. That is not evidence for the entire chain:

$$
\text{TAS phase law}\rightarrow\text{specific shear topology}\rightarrow
\text{channel activation}\rightarrow\text{directed migration}\rightarrow
\text{correct human regeneration}.
$$

Each arrow is a separate hypothesis. PIEZO1 and PIEZO2 are not interchangeable, and downstream pathway activity is not proof of regenerative efficacy.

**TAS handling:** Documented as experimental biology. The simulator produces no channel activation, cell migration, differentiation, or regeneration score.

Primary examples:

- [Qiu et al., ultrasound activation of PIEZO1](https://pmc.ncbi.nlm.nih.gov/articles/PMC6849147/)
- [Zhu et al., PIEZO1 contribution to ultrasound neuromodulation](https://pmc.ncbi.nlm.nih.gov/articles/PMC10161134/)

### C6. 1 Hz refresh, regeneration, and three-second collapse

**Source claim:** A 1 Hz “Mass Gap” refresh synchronises the field to the human heartbeat, prevents adverse thixotropic shear, preserves holographic memory, and collapses within three seconds if interrupted.

**Assessment:** Unsupported. Human heart rate is variable and is not universally 1 Hz. The source gives no oscillator-coupling model, relaxation equation, material-memory measurement, dose-response data, or reason that three missed updates imply collapse.

**TAS handling:** Envelope frequency and duty cycle are independent controls. One hertz is a preset, not a locked constant.

**Decisive test:** Define a measurable field or material-memory observable, its predicted decay law, and blinded controls. Compare 1 Hz against several frequencies and sham exposure while holding time-averaged acoustic energy constant. “Best-looking pattern” is not a valid primary endpoint.

### C7. Biological `L39` eigenmode

**Source claim:** A universal `L39` Golden Cross lattice governs quantum modes, ocean circulation, water, and human tissue; focused ultrasound can write its eigenmodes into biology.

**Assessment:** Undefined. The source does not specify an operator $\mathcal L$, domain $\Omega$, material coefficients, boundary conditions, state space, degeneracy rule, or mapping from “39” to a unique eigenpair:

$$
\mathcal L u=\lambda u.
$$

Without these, there is no calculable biological `L39` mode and no unique frequency.

**TAS handling:** The workbench declares a 2D rectangular Dirichlet eigenproblem and interprets `L39` as its 39th eigenvalue-ranked pair. Under the default square field and generic soft-tissue sound speed, deterministic tie-breaking resolves this to $(m,n)=(7,3)$ at approximately 48.87 kHz. This result belongs to the TAS proxy only.

**How to repair the source:** Publish the operator, geometry, boundary conditions, units, coefficients, spectral ordering, and mapping from anatomical data to the eigenproblem. Provide code and reference cases.

### C8. Tissue index-to-frequency table

**Source claim:** The printed S-DMT equations naturally produce these tissue bands with zero free parameters.

White Paper 83 supplies two candidate frequency expressions:

$$
f_{n,m}=1\ \mathrm{Hz}\times 11.653^{(n-1)/\sqrt2}
\left(\frac32\right)^{m-1}
$$

and

$$
f_k\approx8^{39-k}\ \mathrm{Hz}.
$$

Using $n=k$, $m=1$, and $f_0=1$ Hz as stated:

| Tissue | $k$ | Claimed band | $8^{39-k}$ | $f_{k,1}$ from Music Tree | Literal match? |
|---|---:|---:|---:|---:|:---:|
| Bone / cartilage | 18 | 1–5 MHz | 9.223 EHz | 6.599 THz | No |
| Muscle | 25 | 0.5–2 MHz | 4.398 THz | 1.253 EHz | No |
| Fascia / tendon | 30 | 0.1–0.5 MHz | 134.218 MHz | 7.387×10²¹ Hz | No |
| Epidermis / dermis | 35 | 20–100 kHz | 4.096 kHz | 4.354×10²⁵ Hz | No |

**Assessment:** Internally inconsistent as written. The table may be intended to use an unstated normalisation, reversed index, logarithmic binning, fitted scale, or different mapping, but those would be additional parameters or rules.

**TAS handling:** The exact audit is executable in `auditClaimedTissueBands()` and appears in the UI and JSON export.

**How to repair the source:** For every table row, publish the complete substitution from symbols to value, including units. One global, independently justified calibration may be acceptable; a separate fitted normalisation per tissue would defeat “zero free parameters.”

### C9. Golden phase recurrence and “Maestro” computation

**Source claim:** An AI agent converts healthy morphology into optimal real-time phase delays using

$$
z_{i+1}=\varphi z_i+S_i.
$$

**Assessment:** Undefined. The type and initial value of $z_i$, morphology encoding $S_i$, constraints, loss function, acoustic forward model, phase wrapping, transducer transfer function, and optimisation criterion are absent. Calling the component “AI” does not define an inverse problem.

**TAS handling:** A deterministic golden-angle phase perturbation is supplied as an explicit proxy. It is not claimed to implement the paper's recurrence.

**How to repair the source:** Define target complex pressure $p^*$, forward operator $H$, element drives $q$, constraints, and loss, for example

$$
q^*=\arg\min_q\|Hq-p^*\|_2^2+\lambda R(q),
$$

then state whether the recurrence initialises, regularises, or replaces that optimisation.

### C10. Water memory as phase carrier

**Source claim:** Water stores geometric phase information; pre-conditioning coupling gel with a phase pattern improves regeneration independently of the transducer signal.

**Assessment:** Unsupported. The source invokes Masaru Emoto and Gerald Pollack without identifying a result that establishes persistent, information-bearing acoustic phase memory of the required form. Emoto-style crystal aesthetics do not provide a validated acoustic state variable, storage duration, readout, or causal mechanism.

**TAS handling:** Excluded. Ordinary water material properties can influence acoustic propagation; that is distinct from semantic or geometric “memory.”

**Decisive test:** Predefine a physical readout and blinded classification protocol, randomise preconditioning, include handling controls, and demonstrate independent replication. Regeneration cannot be the first measurement of an undefined carrier state.

### C11. Stem-cell guidance and regeneration

**Source claim:** Pressure nodes act as holographic scaffolds that guide stem-cell migration and differentiation into healthy, scar-free tissue over weeks.

**Assessment:** Unsupported and high-stakes. Acoustic fields can exert forces and influence cells under particular conditions, but the supplied sources do not demonstrate the proposed topology, dose, selectivity, clinical outcome, or absence of harm.

**TAS handling:** No efficacy metric is computed. Modal overlap is a mathematical image-similarity score and must never be described as expected regeneration.

**Translation gate:** Only after acoustic validation should a qualified team design preregistered in vitro studies with sham, energy-matched, phase-randomised, frequency, angle, and positive controls; blinded endpoints; viability and damage assays; and appropriate statistical power. Ex vivo and regulated in vivo stages would follow only if warranted.

### C12. “Scale-invariant, parameter-free, zero free parameters”

**Source claim:** The protocol has no free parameters.

**Assessment:** Contradicted by the source's own required choices. At minimum, a physical system must specify geometry, element count and response, frequency, amplitude, pulse shape, duty cycle, aperture, focus, material properties, attenuation, phase law, exposure duration, refresh timing, target morphology, monitoring endpoint, and stopping rules.

Constants derived from integers do not remove apparatus parameters, patient variability, uncertainty, or model selection.

**TAS handling:** Every input and proxy is declared and exported. Nothing is hidden behind “Maestro.”

## Minimum viable scientific programme

The strongest path is not to begin with regeneration. It is to attack the claims in increasing order of biological risk:

1. **Equation reproduction:** repair C7–C9 until independent code reproduces reference cases.
2. **Water-tank field validation:** measure array phase, amplitude, focus, sidelobes, and angle response.
3. **Layered inert phantoms:** test reflection, refraction, attenuation, aberration correction, and shear displacement.
4. **Claim-specific controls:** preregister the 55.17°, 1 Hz, `L39`, and golden-phase predictions against conventional baselines.
5. **In vitro only after acoustic validation:** test well-defined mechanotransduction endpoints with damage assays and blinded controls.
6. **Independent replication and governance:** no human or animal therapeutic claim before specialist safety, ethics, regulatory, and statistical review.

An ordinary phased-array result is still useful. A TAS-specific result must be a preregistered prediction that conventional acoustic models did not already imply.
