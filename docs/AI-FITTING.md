# Personal AI photo fitting

## Root cause and replacement

The former FashionCarousel rendered InstantGarment plus a foreground head rectangle over the uploaded photo. That necessarily retained original sleeves and introduced cutout edges. The active viewer now contains exactly one whole reference or whole completed AI image per transition frame. It never layers the face, garment or original arms over that result. Existing 3D browsing is a separate visual system and is preserved.

## Components

- src/personalAvatar.tsx: in-tab original reference, revision, consent and change/delete actions. Upload does not run local background removal for AI fitting.
- src/fashion/fittingCoordinator.ts: shared bounded result cache, original-reference job scope, serial execution, coalesced requests, queued-selection cancellation, stale-photo rejection and explicit failure retry.
- src/fashion/fittingClient.ts: private reference-session transport, one photo upload per local session, local garment crop reuse, completed-image decoding and page-exit cleanup.
- src/fashion/FashionCarousel.tsx: existing rail and catalogue actions, consent-once automatic selection, previous-result retention, decoded crossfades and accurate displayed/selected garment labels.
- src/PhotoLookbook.tsx: existing poses and optional 3D conversion, using the same original-photo session and completed cache.
- server/try-on.mjs: existing image adapter and Meshy route dispatch, plus private ephemeral reference sessions and a versioned photo-fitting prompt.

## Local API

GET /api/try-on/status returns configuration availability, provider/model, photo-session support and the real adapter type image-editing. It checks configuration presence; it does not verify a paid generation or certify model output quality.

POST /api/try-on/session accepts person (image data URI) and consent:true. It validates the local origin and image, stores the reference in server memory and returns a random session capability. No endpoint lists or returns saved photographs.

DELETE /api/try-on/session accepts sessionId and removes that local reference. Requests are idempotent. Session timers remove inactive references after 30 minutes. The server bounds storage to four references; restarting clears them all.

POST /api/try-on accepts sessionId, garment image, garmentName, pose, workflow:photo-fit-v3, expectedProvider/expectedModel and consent:true. The original person image and selected garment go to the already-configured /images/edits adapter. Legacy person-based requests and the separate /api/3d routes still work. A mismatched configuration fails before submission. Expired sessions return SESSION_EXPIRED before any provider call; only this known pre-submission case may reconnect the saved photo and submit once. Uncertain image-generation failures never retry automatically.

## Privacy and cache lifecycle

Photos are not written to disk, GitHub, localStorage or sessionStorage. The local backend temporarily holds the reference in memory; the remote image provider receives it only after sharing consent. Provider retention follows its policies and is not erased by local deletion. Navigation can let an already-submitted request finish and cache its result, avoiding a duplicate paid request. Changing/deleting a photo aborts that request and prevents any late response restoring it. The provider may have processed an interrupted request; check its history before retrying.

Cache identity includes photo revision, garment ID, pose, provider, model and workflow version. Completed images are shared across fitting views, bounded to 16 entries and roughly 64 MiB of string storage. Old entries can be evicted under that bound. Replacing the photo clears the entire cache. A full page reload clears browser data; pagehide sends best-effort backend deletion. Idle expiry handles missed cleanup.

## Service and visual limits

The configured service is ZaoAPI at https://api.miaoquai.com/v1 with gpt-image-1 and the existing private OPENAI_API_KEY. No credentials were invented, migrated or published. The adapter supports two-reference image editing. It is not claimed to be a specialised virtual-try-on model, independent human parser, dense-pose network or physical cloth simulator. Those operations are delegated to the image editor through the reference images and instructions. A dedicated VTON adapter could replace fittingClient's transport while preserving the coordinator/view contract if the general editor's quality is insufficient; that requires selecting and configuring an actual service, not a UI-only change.

The prompt requests unchanged identity/proportions, original body extent and pose, complete old clothing replacement, hair/hand occlusion and a consistent portrait background. It cannot guarantee the model obeys every instruction. Identity, sleeves, shoulder alignment, fabric, hands and proportions must be reviewed on real generated outputs. Cropped photographs do not establish the unseen body. No perfect-fit or face-preservation guarantee is made.

OpenAI documents high input fidelity for preserving detail in reference edits, but that does not certify ZaoAPI's implementation or any particular fitting result: https://developers.openai.com/cookbook/examples/generate_images_with_high_input_fidelity

## Verification

npm run build
npm run test:fitting
npm run test:tryon
npm run test:3d

45 tests passed with mocked providers. They cover consent/origin checks, original reference reuse, session deletion/expiry/bounds, duplicate requests, queued navigation, late results, explicit retries, cache scoping, image response formats, safe diagnostics and preserved 3D lifecycle. Browser tests used a clearly labelled mock result for loading/transition checks; they do not prove visual realism. No agent-initiated paid provider inference was run. The mock servers were stopped and the real preview reopened at http://localhost:5175/fashion.
