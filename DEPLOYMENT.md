# NEXAISLE hosted demo

Public website: https://nexaisle-shopping-studio.kaarthikha15.chatgpt.site

The Sites deployment serves the Vite production build from `dist/`. Run `npm ci` then `npm run build`. `.openai/hosting.json` identifies the hosted site.

The showroom, cart, demo checkout, receipts and local IndexedDB avatar photos run in the browser. Browser data is scoped to the website address: a photo saved on localhost must be selected once again on the hosted website.

AI image generation is not connected on this public static demo. The existing local Node API remains available for local development; publishing its image generation requires a hosted backend and separately configured server-side credentials. No API key or local `.env` is included.

The supplied restricted PRX model remains local-preview only and is excluded from publication.
