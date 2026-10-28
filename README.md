# NEXAISLE — interactive concept preview

React + TypeScript + Vite + React Three Fiber. No paid API keys required.

```sh
npm ci
npm run dev -- --port 5173 --strictPort
```

In remote VS Code, forward port **5173** from the Ports panel and open its forwarded address. `npm run build` checks TypeScript and builds the production site.

Explore the homepage, customize avatar colours, enter separate grocery and fashion 3D scenes, move with WASD/arrows, rotate the orbit camera by dragging, and click displayed products or catalogue entries. Add groceries and clothing sizes to a shared persistent bag, then complete a demo checkout and print/save the animated digital receipt. Nova performs catalogue lookup and speaks via browser speech synthesis. All transactions and products are demo data.

This first preview uses procedural geometry. It does not yet include a follow camera, complete collision physics, voice recognition, employee pathfinding, fitting simulation, a physical 3D receipt printer, or real backend/payment integration. The receipt animation is currently a 2D paper reveal. Thirty grocery products and twelve fashion products appear in the catalogue; only a representative selection is placed in the grocery scene.

Source: `src/Scene.tsx` (3D), `src/store.ts` (catalogue, persisted avatar/cart/orders), `src/main.tsx` (routes and UI), `src/style.css` (responsive theme). Local browser storage is used for demo persistence. Fonts fall back to system fonts if Google Fonts is unavailable.
