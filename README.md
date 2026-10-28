# NEXAISLE — interactive 3D shopping

A React + TypeScript + Vite + React Three Fiber concept. No paid API keys needed.

## Open the website

Unzip the GitHub download, open the extracted folder in VS Code, then open **Terminal → New Terminal**:

```sh
npm ci
npm run dev
```

Open the **Local** address Vite prints. Keep that terminal running. Node.js 20.19+ or 22.12+ is required (Node 24 was used for development). When developing remotely, forward the actual Vite port in VS Code's Ports panel.

## Shopping experience

- Eight physically stocked grocery aisles with 48 products, shelf labels/prices, branded demo cartons, bottles, jars, pantry packs, and fresh produce. Every catalogue product has a shelf location in its declared aisle.
- A separate fashion atelier with four rails and 12 three-dimensional garments/accessories. Click a garment on a rail or in the catalogue to open its enlarged, rotatable 3D inspection view. Pick a size and add it to your bag. Models include dress/skirt folds, sleeves, hangers, jacket details, trouser legs and shoes.
- Walk with **WASD / arrow keys**, or hold the onscreen arrow buttons. Drag to look around and scroll to zoom. The walk-through camera follows the avatar. Switch to **Store overview** for an orbit view, or **Expand store** for a larger experience.
- The grocery avatar pushes a trolley; grocery selections fill it. Shelf and wall collision checks keep the avatar/trolley out of fixtures. Movement pauses while a product or assistant panel is open.
- Four **simulated shoppers** walk around each store, with arm/leg animation and pauses. These are local NPCs, not real visitors or live shopping activity.
- A visible **Nova** employee can be clicked in the scene. Ask a product question, use browser text-to-speech, inspect the result, or move directly to its aisle/rack entrance. The assistant searches the actual active level catalogue. Employee follow-me navigation and microphone input are not implemented.
- Shared localStorage avatar colours, grocery/fashion cart, clothing sizes, demo orders and animated paper receipts. Checkout is a demo: no payments or real orders. Receipts can be printed or saved as PDF with your browser.

The store and product models are original procedural geometry and canvas-generated labels; they are not photorealistic scans or accurate garment fit simulations. The fitting-suite panel is decorative, not a live avatar reflection. NPCs do not collide with other people. The paper receipt is a 2D reveal, not a physical 3D printer. No backend or multiplayer service is connected.

## Validate / source

```sh
npm run build
```

`src/Scene.tsx`: environments, movement, NPCs and inspection canvas.
`src/world/Models.tsx`: procedural products, cloth, people, labels and trolley.
`src/world/layout.ts`: aisle/rack coordinates and obstacle bounds.
`src/store.ts`: product catalogue and persistent avatar/cart/orders.
`src/main.tsx`: screens, assistant and checkout UI.
`src/style.css`: responsive styling.

Fonts fall back to system fonts if Google Fonts is unavailable. Use a WebGL-capable browser with hardware acceleration for best performance.
