# Circular watch showroom — prototype status

The showroom uses one physical circular platform and four independent 3D objects orbiting at radius 3.25. It contains no photograph planes or photo-angle slideshow. The original two-by-two display has been removed.

## Visual fidelity remains incomplete
No GLB or GLTF files were found in the existing project. No licensed exact-reference, component-separated Tissot model is installed. All four exterior representations remain procedural prototypes. Their shapes, finishing, engraving, bracelets, date details and internal calibres do not meet the photorealistic reference standard. The interaction can be reviewed, but the final model-quality requirement is not complete.

Still required:
- T137.407.11.041.00 — PRX Powermatic 80, accurate integrated case and bracelet, blue waffle dial, verified automatic movement.
- T120.807.22.051.00 — Seastar 1000, black dial, two-tone steel/PVD bracelet, dive bezel, correct crown guards and verified automatic movement.
- T006.407.11.043.00 — Le Locle Powermatic 80, Roman numeral blue dial, fine multi-row bracelet, slim case and verified movement.
- T137.417.11.041.00 — PRX quartz Chronograph, exact blue dial/counters, integrated case, pushers and G10.212 component assembly.

Provide GLB/GLTF plus documented commercial/web redistribution permission. Textures should include base colour, metallic, roughness and normal maps. Source photographs are visual references and do not substitute for licensed geometry.

## Supported asset interface
Set `modelUrl` and `componentModelUrl` in watchCollection.ts to local public URLs. The component asset must contain top-level, separately named component groups in the watch local frame, facing +Z, with origin at dial centre. Normalize full watch height to approximately 3.5 scene units. Layer local Z origins should match the watchCollection part definitions. Preserve local geometry offsets inside each named group. Existing code physically animates each group and highlights descendant mesh materials.

Supported group names: crystal, bezel, hour, minute, second, dial, date, movement, gears, bridges, plate, rotor, battery, circuit, motors, case, crown, pushers, back, strap. Use mechanical groups only for automatic watches; battery/circuit/motors only for quartz. Unknown nodes stay assembled. Validate dimensions, pivots, date locations and materials against the exact reference before release.

The current internal wheel trains and electronic modules are educational illustrations, not Tissot service diagrams. No precision, water-resistance or engineering certification is implied by animation.
