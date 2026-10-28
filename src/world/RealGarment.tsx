import { useEffect, useMemo, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import type { Product } from '../store';
import { Garment } from './Models';

/**
 * Distinct, modeled garments on real 3D hangers, rather than procedural cones.
 * Asset source: https://3dassets.dev/packs/clothing-rail-and-wardrobe
 * CC0 1.0 public-domain dedication, CORS-enabled GLB CDN.
 * Demo assets illustrate silhouettes; they are not verified representations
 * of commercial SKUs and might differ from the demo catalogue colour.
 */
const modelUrls: Record<string,string> = {
  f0: 'https://cdn.3dassets.dev/assets/35452/v1/model.glb', // hoodie
  f1: 'https://cdn.3dassets.dev/assets/35447/v1/model.glb', // tee
  f2: 'https://cdn.3dassets.dev/assets/35454/v1/model.glb', // jacket
  f3: 'https://cdn.3dassets.dev/assets/35457/v1/model.glb', // trousers
  f4: 'https://cdn.3dassets.dev/assets/35455/v1/model.glb', // dress
  f6: 'https://cdn.3dassets.dev/assets/35448/v1/model.glb', // shirt
  f7: 'https://cdn.3dassets.dev/assets/35451/v1/model.glb', // knitwear
  f8: 'https://cdn.3dassets.dev/assets/35453/v1/model.glb' // coat
  // Skirt and utility vest use type-correct local fallback silhouettes instead of
  // falsely presenting a dress or jacket as the selected product.
};

const loader = new GLTFLoader();
const cache = new Map<string,Promise<THREE.Group>>();
function getModel(url:string) {
  if (!cache.has(url)) {
    cache.set(url,loader.loadAsync(url).then(gltf => {
      gltf.scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.castShadow=true;
          object.receiveShadow=true;
        }
      });
      return gltf.scene;
    }));
  }
  return cache.get(url)!;
}

export const hasHangingGarment = (product:Product) => !!modelUrls[product.id];

export function RealGarment({product}:{product:Product}) {
  const url=modelUrls[product.id];
  const [loaded,setLoaded]=useState<{url:string;model:THREE.Group}|null>(null);
  useEffect(()=>{
    if (!url) return;
    let active=true;
    getModel(url).then(scene=>{
      if(active) setLoaded({url,model:scene.clone(true)});
    }).catch(error=>{
      // Reuse local procedural model if remote assets are unavailable.
      console.warn('Could not load hanging garment:',product.name,error);
    });
    return ()=>{active=false};
  },[url,product.name]);
  const model=useMemo(()=>loaded?.url===url?loaded.model:null,[loaded,url]);
  if (!model) return <group position={[0,-.79,0]}><Garment product={product} /></group>;
  // GLB hook pivot is at [0,0,0], so when placed at rail Y the garment hangs below it.
  return <primitive object={model}/>;
}
