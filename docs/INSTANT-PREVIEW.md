# Instant Preview and Realistic AI

Instant Preview is the default. It shows the unchanged original photo immediately, runs one local MediaPipe pose/segmentation pass, and caches shoulder, waist, hip, knee and ankle landmarks in tab memory. Waist is estimated between shoulders and hips rather than treating the hip line as the waist. Garment-specific source seams drive shirts, jackets, coats, dresses, skirts and trousers. Dress shoulder/waist/hip/hem positions have separate vertical controls and the lower skirt uses uniform horizontal scaling to preserve its photographed silhouette. Trouser leg centres follow the individual knees and ankles. Missing lower-body landmarks are flagged; manual three-point calibration plus width, length, translation and rotation remain available.

The model photo, face, pose and background do not change during local switching. Local preview remains an approximation: existing clothes can remain visible and hair/arm occlusion is not guaranteed. The optional local segmentation mask only constrains soft head/hand foreground masks; no hard rectangular face cutout is rendered. These masks are not semantic hair parsing or a physical clothing simulation.

One atlas is loaded and decoded once. Up to 12 rasterised garment canvases are cached; neighbouring garments are warmed locally. Switching reuses canvases without PNG encoding or paid inference. The original photo is not included in those cached garment canvases. Replacing/deleting the photo clears body measurements, local canvases and AI results. The garment transition lasts 160 ms unless reduced motion is enabled.

Realistic AI is a separate mode. Clicking Generate Realistic Look uses the existing configured ZaoAPI image-editing adapter after sharing consent. Selecting arrows or thumbnails in Instant Preview never submits AI requests. Switching to Realistic AI alone also does not submit one. The coordinator retains request deduplication, completed caches and original-photo server sessions. Adjacent completed AI images are decoded in advance; unselected paid generations are not prefetched. PhotoLookbook uses the same original reference and AI-result cache.

No new paid API, model or credential was added. The provider-specific faster quality settings for ZaoAPI have not been verified, so the existing high-fidelity request options remain unchanged. Speed gains come from local rendering, preloading, no duplicate requests and completed-result reuse, not a claim that provider inference is instantaneous. The UI records the last AI round-trip duration separately.

## Measurements and validation

The in-browser measurement starts at the selection event and reports after the garment transition and a subsequent painted frame. It shows the last duration, p95 across up to 30 switches, and whether the local canvas came from cache. Initial model loading is excluded until body anchors are available. The target is under 300 ms after loading; it is not asserted without a browser measurement.

A 1,000-sample CPU-only geometry benchmark on this machine measured median 0.0042 ms and p95 0.0243 ms for constructing and mapping each garment grid. This excludes rasterisation, browser painting and animation, so it is not an end-to-end switch benchmark.

Production build passed. 52 tests passed, including garment endpoint/flare/trouser/manual-control checks and the existing coordinator, photo-session, image-adapter and 3D tests. Final live browser inspection was blocked by an automatic approval-review usage limit. The real preview returned HTTP 200 at http://localhost:5175/fashion and the existing ZaoAPI backend reported available with photo sessions enabled. No paid test inference was initiated by the agent.
