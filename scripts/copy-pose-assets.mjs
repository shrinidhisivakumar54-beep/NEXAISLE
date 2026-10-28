import { copyFileSync, mkdirSync } from 'node:fs';
const files=['pose.js','pose_web.binarypb','pose_solution_packed_assets.data','pose_solution_packed_assets_loader.js','pose_solution_simd_wasm_bin.js','pose_solution_simd_wasm_bin.wasm','pose_solution_simd_wasm_bin.data','pose_solution_wasm_bin.js','pose_solution_wasm_bin.wasm','pose_landmark_lite.tflite'];
mkdirSync(new URL('../public/pose/',import.meta.url),{recursive:true});
for(const file of files)copyFileSync(new URL('../node_modules/@mediapipe/pose/'+file,import.meta.url),new URL('../public/pose/'+file,import.meta.url));
