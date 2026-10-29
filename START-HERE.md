# Open your saved Nexaisle project

Open the folder containing package.json in VS Code. Run npm ci once after downloading or updating dependencies.

Keep these two terminals open in that same folder:

Terminal 1: npm run dev

Terminal 2: npm run server

Open the Local URL printed by the first terminal. If a port is already in use, use the running terminal rather than starting duplicates.

Keep your existing private .env beside package.json for AI generation. It stays on your computer and is not backed up to GitHub. Never put API keys in VITE_ variables. Optional Meshy configuration is described in README.md.

Photo fitting: upload a clear reference once, then enable the AI fitting room. New selected outfits are edited by the configured image service; charges may apply and processing takes time. Completed looks switch from cache. The first result needs a real provider response; the app never substitutes a garment overlay. Private photos and generated looks are session data, not project files.

The local preview is not a public share link. A GitHub save backs up source; deploying the site is a separate step.


Current preview: http://localhost:5175/fashion . Choose Instant Preview for local garment switching; choose Generate Realistic Look only for optional provider-backed photo editing. Instant preview is approximate and includes a measured switch-time readout.
