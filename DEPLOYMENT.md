# NEXAISLE deployment

Production Vercel website: https://nexaisle.vercel.app

Vercel project `nexaisle` belongs to the `shrinidhi10` workspace and builds GitHub `main` using Vite, `npm run build`, and output directory `dist`.

## AI generation

`api/index.js` adapts requests to the existing `server/try-on.mjs` and `server/lighting.mjs` handlers. `vercel.json` routes `/api/*` to this function, preserves SPA deep links, bundles IKEA reference images, and allows 300 seconds per invocation. The old static unavailable-status file has been removed.

Configure `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_IMAGE_MODEL` in Vercel Production settings, then redeploy. Keys stay server-side. ZaoAPI uses `https://api.miaoquai.com/v1`. Keep `VITE_LOCAL_PRX_PREVIEW=false`.

Hosted responses request JPEG to reduce response size. Requests above 4 MB are rejected with a clear error. Catalogue disk caching is disabled in the ephemeral Vercel function; customer photos are never written to server files. In-process queue and cooldown are per function instance, not global provider-budget controls.

The cart, receipts and IndexedDB avatar photos remain browser-local. A localhost photo must be selected once again on the Vercel domain. The restricted supplied PRX model remains local-only and is excluded from publication.

The older Sites-hosted static demo does not gain the Vercel backend automatically; use the Vercel link for AI generation.
