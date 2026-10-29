# NEXAISLE — interactive 3D shopping

A React + TypeScript + Vite + React Three Fiber concept. Shopping and the local mirror need no API key. Optional AI photo generation requires a paid server-side image API key.

![Fashion World showroom](docs/fashion-showroom.png)

## Open the website

Unzip the GitHub download, open the extracted folder in VS Code, then open **Terminal → New Terminal**:

```sh
npm ci
npm run dev
```

Open the **Local** address Vite prints. Keep that terminal running. Node.js 20.19+ or 22.12+ is required (Node 24 was used for development). When developing remotely, forward the actual Vite port in VS Code's Ports panel.

## Shopping experience

- Eight physically stocked grocery aisles with 48 products, shelf labels/prices, branded demo cartons, bottles, jars, pantry packs, and fresh produce. Every catalogue product has a shelf location in its declared aisle.
- A separate ivory fashion showroom with a single chrome rail, ten hanging garments, modeled wooden hangers/metal hooks and original photographic-style garment cutouts. Hover or keyboard-focus to turn a piece toward the camera while its hook stays anchored; click or tap it to open an enlarged product view. Neighboring pieces stay still. Product information appears below the piece, with a larger tilt/zoom inspector and size selection. Category filters, a horizontally scrollable mobile rail and a twelve-piece editorial grid share the existing cart. Front imagery and one colourway per garment are currently available.
- Walk with **WASD / arrow keys**, or hold the onscreen arrow buttons. Drag to look around and scroll to zoom. The walk-through camera follows the avatar. Switch to **Store overview** for an orbit view, or **Expand store** for a larger experience.
- The grocery avatar pushes a trolley; grocery selections fill it. Shelf and wall collision checks keep the avatar/trolley out of fixtures. Movement pauses while a product or assistant panel is open.
- Four **simulated shoppers** walk around each store, with arm/leg animation and pauses. These are local NPCs, not real visitors or live shopping activity.
- A visible **Nova** employee can be clicked in the scene. Ask a product question, use browser text-to-speech, inspect the result, or move directly to its aisle/rack entrance. The assistant searches the actual active level catalogue. Employee follow-me navigation and microphone input are not implemented.
- Shared localStorage avatar colours, grocery/fashion cart, clothing sizes, demo orders and animated paper receipts. Checkout is a demo: no payments or real orders. Receipts can be printed or saved as PDF with your browser.

Grocery World and avatars use original procedural geometry and canvas-generated labels. Fashion World uses a hybrid 2.5D/3D presentation with AI-generated garment cutouts (see `public/fashion/README.md`), not scans of physical inventory or garment fit simulations. NPCs do not collide with other people. The paper receipt is a 2D reveal, not a physical 3D printer. No multiplayer service is connected. An optional local backend supports AI photo generation.

![Grocery World with the shared theme](docs/grocery-world.png)

## AI photo lookbook (optional)

Click a garment → **CREATE MY AI LOOKBOOK**. Upload a clear full-body JPG, PNG or WebP (up to 10 MB), select a garment and one to three poses, agree to send the photo for generation, and choose **Generate**. Completed images can be enlarged and downloaded. Each pose makes a separate paid image request. Images are not saved in this app's database or localStorage; closing the studio clears them. The external provider's data policies apply after generation is requested.

To enable generation locally in VS Code:

1. Copy `.env.example` to `.env` in the project folder.
2. Set `OPENAI_API_KEY` in that file to your own API key with image-generation access and billing. Do not paste it into chat or use a `VITE_` variable. `.env` is ignored by Git.
3. In one terminal run `npm run server` (Node 20.19+). In another run `npm run dev`.
4. Open Vite's Local URL. Vite forwards `/api` to the loopback server on port 8787.

The server calls OpenAI's `gpt-image-1` image-edit endpoint with the person photo and a transparent crop of the selected garment, requesting high-fidelity input, natural drape, preserved identity and the chosen pose. It validates request size, pose and consent, limits concurrent requests, times out after three minutes, and does not persist photos or expose the API key to the browser. Uploading alone makes no generation request. Cancellation stops remaining poses, but an already-submitted provider request may still incur a charge.

**Status:** UI and API contract tested with simulated provider responses; real image generation has not been verified in this environment because no image API key is configured and `api.openai.com` is not allowed by its current network policy. No fabricated generated results are shown when disconnected. The camera mirror remains available.

Results are AI illustrations, not guaranteed identity-perfect images, garment fidelity or real size/fit predictions. Back-side garment details are unavailable and may be invented. Poses are still photographs, not animation or video. The current backend binds only to localhost and is intended for local development. Before public hosting, provide an authenticated backend with per-user quotas, billing controls and HTTPS; a static-only/StackBlitz preview cannot provide this secret-backed service. Never expose the development API publicly as an unrestricted paid-generation endpoint.

Validation: `npm run build` and `npm run test:tryon`.

## Connect ZaoAPI

In the project folder, create a private `.env` beside `package.json`:

```env
OPENAI_API_KEY=your_zaoapi_key_here
OPENAI_BASE_URL=https://api.miaoquai.com/v1
OPENAI_IMAGE_MODEL=gpt-image-1
```

Run `npm run server` and `npm run dev` in separate terminals, then refresh the website. Restart the server after changing `.env`. The variable name OPENAI_API_KEY is retained for compatibility; its value here is your ZaoAPI key. Photo consent identifies ZaoAPI as the recipient.

ZaoAPI's model catalogue was confirmed by the user's local test to list gpt-image-1. Actual two-image editing remains unverified: this adapter assumes the OpenAI-compatible POST /v1/images/edits contract and base64 image response. Mock tests verify routing and request construction only. If generation fails, the UI reports the provider HTTP status without exposing credentials. The server does not fall back to another provider or follow credential-bearing redirects.

## Camera try-on

![Camera try-on](docs/camera-try-on.png)

Click a garment, choose **CREATE MY AI LOOKBOOK**, select **Use the local camera mirror**, then click **USE CAMERA** and allow camera access. The camera only starts after that click. You can also upload a photo instead.

The selected garment's actual atlas cutout is overlaid on live video or your photo. Drag it, adjust overlay scale/position/opacity, choose the clothing size for your bag, switch garments, or freeze a photo. It is a landmark-aligned visual styling preview, not automatic cloth draping or an accurate size/fit prediction. Uploaded/frozen photos are checked locally for shoulders and waist with MediaPipe Pose. For live video, use **AUTO-ALIGN BODY** to sample the current pose; this is not continuous body tracking. Keep both shoulders and your waist visible. If detection fails, choose **SET 3 BODY POINTS**, then tap the shoulder on the left side of the photo, the shoulder on the right, and waist center. Automatic shoulder fitting is available for tops, dresses and coats; bottoms and shoes retain manual controls. Garment width and length are fitted independently; length and shoulder tilt can be refined separately. The overlay is now clipped to the photo itself, including when the preview is letterboxed. Photos stay in browser memory, and closing the mirror stops the camera. No external try-on API is used. The pose runtime and lite model are served from `public/pose` and run on your device; no photo is sent out for detection. These model files add about 18 MB to the project. `node scripts/copy-pose-assets.mjs` refreshes those unmodified files from the pinned npm dependency after installation. See `public/pose/LICENSE.txt` for the Apache-2.0 license. Arm occlusion, removal of your original clothing and realistic cloth replacement are not implemented; those require a more advanced virtual try-on renderer.

Camera access requires HTTPS or localhost and permission in your browser/system settings. Run Vite and open the Local address it prints when using your own computer. If camera access is unavailable, use **UPLOAD PHOTO**.

The ivory-and-navy theme now applies throughout the app, including Grocery World's 3D architecture and shelves. The camera flow was checked with a simulated browser webcam; actual camera hardware must be permitted on your device.

## Validate / source

```sh
npm run build
```

`src/Scene.tsx`: grocery environment, movement, NPCs and shared inspection entry point.
`src/fashion/`: the isolated fashion showroom, collection metadata, rail/photographic inspector and scoped styling.
`src/world/Models.tsx`: procedural products, cloth, people, labels and trolley.
`src/world/layout.ts`: aisle/rack coordinates and obstacle bounds.
`src/store.ts`: product catalogue and persistent avatar/cart/orders.
`src/main.tsx`: screens, assistant and checkout UI.
`src/TryOnStudio.tsx` / `src/tryon.css`: local live-camera/photo styling preview.
`src/theme.css`: shared ivory-and-navy theme.
`src/style.css`: responsive styling.

Fonts fall back to system fonts if Google Fonts is unavailable. Use a WebGL-capable browser with hardware acceleration for best performance.

## Shrinidhi Project Studio

Your projects homepage is at **/projects/** on the same website. Locally, start `npm run dev` and add `/projects/` to the Local URL Vite prints. NEXAISLE is the first project, with direct links to its fashion and grocery worlds.

Edit `public/projects/index.html` to update the studio name, text, or project cards. Styles are in `public/projects/studio.css`; screenshots are in `public/projects/images/`. The next-project panel is editorial text, not a live project or a button.

### Save and back up

Save edits in VS Code with Cmd+S. Keep the project folder, and commit/push source changes to GitHub for an online backup. Keep `.env` private; it is intentionally excluded from Git. The repository does not back up that file. On a new computer, install Node, run `npm install`, and recreate your private `.env`.

### Publish a shareable studio and shopping demo on Netlify

1. Sign in to Netlify and choose Add new project → Import an existing project.
2. Connect GitHub and select `shrinidhisivakumar54-beep/NEXAISLE`, branch `main`.
3. Build command: `npm run build`. Publish directory: `dist`. These are also configured in `netlify.toml`.
4. Deploy. Netlify assigns the actual public URL; append `/projects/` to open the studio. Use that full address as your portfolio link.
5. Later GitHub updates can redeploy automatically. A custom domain is optional.

This is a **static preview deployment**. It includes the studio, shopping worlds, and local camera mirror. AI lookbook generation needs a separate authenticated backend and is not enabled by Netlify's static deployment. Do not put your API key in frontend code or a VITE_ variable. The /api route returns an explicit unavailable response on this preview. Your existing local server continues to work on your Mac. No hosting account is connected to this workspace, so a public URL has not been provisioned or verified.

## True 3D outfit reconstruction (Meshy)

The photo lookbook now offers **Make this look 3D** under each successful outfit image. This creates an actual textured GLB mesh through Meshy, then displays it in the browser with full orbit, front/left/back/right controls, zoom, reset and optional slow rotation. Download the GLB to keep it. This is separate from the ZaoAPI photo-generation connection.

### Connect the additional service

1. Create a Meshy account at https://www.meshy.ai/ and obtain a Meshy API key. Confirm API access and sufficient credits in that account; image-to-3D conversion is separately billed by Meshy.
2. Add `MESHY_API_KEY=your_meshy_key_here` to the existing private `.env` beside `package.json`. Keep the existing OPENAI/ZaoAPI lines. Never put this key in a VITE_ variable or share it in chat.
3. Restart `npm run server`; keep `npm run dev` running in the other terminal.
4. Generate a full-body outfit photo as before. Under that result choose **Make this look 3D**, agree to send that generated image to Meshy, and choose **Create 3D model**.
5. Keep the fitting studio open while the task runs. Choose **View in 360°** once ready. Download before closing the studio.

If the server reports the service is disconnected, its configuration status is available at `http://127.0.0.1:8787/api/3d/status`; it never prints the key.

Use a clear image of one person with head and feet visible and arms separated from the torso. The model is an estimated reconstruction of the generated image, not a scan of the original person. Face, proportions, garment details and unseen surfaces can change. One model represents one outfit: changing clothes requires another conversion. It is not rigged for animation and does not simulate fabric or physical fit.

### Lifecycle and verification

The adapter uses Meshy's image-to-3D POST/GET contract at `https://api.meshy.ai/openapi/v1/image-to-3d`. Creation sends the generated image as a data URI, requests texturing/PBR, and returns a local task reference. Polling does not create extra paid tasks. Only one conversion runs at a time per local server. Downloading goes through the backend, with a 50 MB cap and Meshy asset-host validation; keys never go to the browser or asset host.

The app stores task references only in server memory and photo/results only in the open lookbook. Closing/replacing results loses the UI reference; restarting the backend loses all task references. It does not cancel a provider task. Meshy task history is the fallback for recovery or checking uncertain submissions. Check that history before retrying an interrupted creation. No automatic paid retries are made. The app does not persist uploaded/generated photos; provider storage and retention are governed by Meshy's policies.

Live Meshy conversion has **not** been verified in this environment: no Meshy key is configured. Unit tests use simulated provider responses; browser checks use a synthetic GLB fixture, not a claimed reconstruction of the user. The viewer supports self-contained uncompressed GLB with embedded images; externally linked assets and Draco/Meshopt/KTX compression report a clear unsupported-format message.

Run `npm run test:3d` for the backend lifecycle tests. The static Netlify preview still does not host either AI backend. Full public use needs an authenticated, quota-controlled server before exposing paid generation routes.

## Interactive shopping upgrade

Fashion World keeps its 3D hanger rail, catalogue and navigation, but personalised fitting now displays complete images returned by the connected image editor. The personalised viewer no longer renders InstantGarment, a face patch, a segmentation cutout, a garment texture or original sleeve layers. A reference is clearly labelled until an edited result is available. The previous complete photo stays visible while a new look is requested and decoded; only then does the viewer crossfade to it.

Upload one reference in My avatar, Fashion World or the photo studio. Enable AI fitting once per reference and provider configuration. Selecting a new garment then requests one fitting after a short navigation debounce. Completed looks use the same cache in the carousel and photo studio. The shared coordinator serialises requests, deduplicates identical in-flight work, skips obsolete queued selections and caches submitted work that completes after navigation. It does not retry uncertain paid submissions automatically. It preloads neighbouring completed images and local garment crops, not unselected paid generations.

The local API stores the original reference once in a capability-token photo session. Every fitting uses that same original image, never a previous AI-generated body or face. Reference changes/deletion clear the browser cache and local server session and abort outdated requests; page exit requests deletion using keepalive. Server sessions also expire after 30 minutes of inactivity, with a maximum of four references. Browser results are bounded to 16 images and approximately 64 MiB of string storage. A server restart or idle expiry may require the client to resend its still-saved original reference once, without another file-picker upload.

The existing private ZaoAPI configuration is used: OPENAI_API_KEY, OPENAI_BASE_URL=https://api.miaoquai.com/v1 and OPENAI_IMAGE_MODEL=gpt-image-1 in .env. This is an OpenAI-compatible general image-editing adapter, not a verified dedicated virtual-try-on or cloth-simulation model. It sends the original person image first, the garment image second, high input fidelity and instructions for complete clothing replacement, hair/hand occlusion, original body proportions and consistent studio framing. Human parsing and garment fitting are delegated to the image editor; no independent semantic-parser or dense-pose inference service is installed or claimed. Face/garment fidelity and visual realism need review on real provider output. Full-body input is recommended; cropped input must not be presented as measured or known unseen proportions.

No agent-initiated paid generation was used for verification. The production build and 45 mock-backed image, photo-session, coordinator and 3D tests passed. Browser checks showed a previous complete image remaining visible for a new selected garment, decoded result replacement and zero face/garment patch layers. The isolated test preview used an obvious labelled fixture and was stopped afterwards. Use the real preview URL printed by npm run dev; the temporary test port 5181 is not the live fitting service. See docs/AI-FITTING.md for architecture and limitations.

Lighting includes See It in Your Space with five selectable room concepts and a bathroom thumbnail disabled until wet-area suitability is verified. The same manufacturer photograph is reused on generated room backgrounds. Zoom, two-room comparison, photo tilt, day/night and existing colour/power controls are available. These are illustrative composites, not calibrated scale or true 360-degree models. Original manufacturer room photographs remain available. Mattress controls and reports are preserved.

Selected groceries have illustrated characters with cursor-following eyes, blinking and hover reactions, plus cart feedback. Product names, prices, details and cart controls remain available. Decorative motion respects reduced-motion preferences. Selected 3D products also have subtle faces.

The fashion, furniture, mattress, photo studio and 3D scene routes load on demand. Clothing shares one local atlas; room concepts share one compressed JPEG atlas. Room changes and carousel arrows never call a generation API. Personal photo/AI caches are memory-only. The room atlas is AI-created concept imagery; lighting and mattress product images retain their original IKEA source attribution.

Validation: run npm run build, npm run test:tryon, and npm run test:3d. Live paid image generation is not part of automated checks. The project keeps your existing private .env on this computer; it is intentionally excluded from GitHub. Use the two terminals described above to start the frontend and local API.

## Current two-mode fitting workflow

Instant Preview is now the default: unchanged original photo, local MediaPipe body anchors, garment-specific approximate fitting, manual adjustments, thumbnails and cached local switching. Realistic AI is explicitly requested with Generate Realistic Look and uses the existing provider and shared cache. Earlier notes describing AI-only default behaviour are superseded by docs/INSTANT-PREVIEW.md. No new paid service was added. Final browser inspection was blocked by an approval-review usage limit; build and all 52 tests passed. Open http://localhost:5175/fashion for the real local preview.
