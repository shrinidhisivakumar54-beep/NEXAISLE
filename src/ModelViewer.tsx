import {Component,useEffect,useRef,useState,type ReactNode} from 'react';
import {Canvas,useThree} from '@react-three/fiber';
import {OrbitControls,ContactShadows} from '@react-three/drei';
import type {OrbitControls as OrbitControlsImpl} from 'three-stdlib';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import {Download,RotateCcw,X} from 'lucide-react';
import './model-viewer.css';

const MAX_BYTES=50*1024*1024;
type FittedModel={scene:THREE.Group;scale:number;position:[number,number,number]};
type View={angle:number;revision:number};

function releaseModel(scene:THREE.Object3D){
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>(),skeletons=new Set<THREE.Skeleton>();
  scene.traverse(object=>{if(object instanceof THREE.SkinnedMesh)skeletons.add(object.skeleton);if(object instanceof THREE.Mesh){geometries.add(object.geometry);const list=Array.isArray(object.material)?object.material:[object.material];for(const material of list){materials.add(material);for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);}}});
  geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());
  skeletons.forEach(skeleton=>skeleton.dispose());
  textures.forEach(texture=>{texture.dispose();if(typeof ImageBitmap!=='undefined'&&texture.image instanceof ImageBitmap)texture.image.close();});
}

/** Reject remote resource references before GLTFLoader can resolve them. */
function validateGLB(buffer:ArrayBuffer){
  if(buffer.byteLength<20||buffer.byteLength>MAX_BYTES)throw new Error('Choose a complete GLB model smaller than 50 MB.');
  const header=new DataView(buffer);
  if(header.getUint32(0,true)!==0x46546c67||header.getUint32(4,true)!==2||header.getUint32(8,true)!==buffer.byteLength)throw new Error('The service did not return a valid GLB 2.0 model.');
  const jsonLength=header.getUint32(12,true);
  if(header.getUint32(16,true)!==0x4e4f534a||jsonLength>buffer.byteLength-20)throw new Error('The model has an invalid scene description.');
  let doc;
  try{doc=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonLength)).replace(/\0+$/,''));}catch{throw new Error('The model scene description could not be read.');}
  if(!doc||typeof doc!=='object')throw new Error('The model scene description is missing.');
  for(const item of [...(doc.buffers||[]),...(doc.images||[])]){
    if(item.uri!==undefined&&(typeof item.uri!=='string'||!/^data:(image\/(png|jpeg|webp)|application\/octet-stream|application\/gltf-buffer);base64,/.test(item.uri)))throw new Error('This model uses external textures or buffers. A self-contained GLB is required.');
  }
  const unsupported=['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu'];
  if((doc.extensionsUsed||[]).some((extension:string)=>unsupported.includes(extension)))throw new Error('This model uses unsupported compression. Export an uncompressed GLB with embedded PNG or JPG textures.');
  if((doc.nodes||[]).length>10000||(doc.meshes||[]).length>2000||(doc.images||[]).length>64)throw new Error('This model is too complex for the browser viewer.');
  let components=0;
  for(const accessor of doc.accessors||[]){if(!Number.isFinite(accessor.count)||accessor.count<0)throw new Error('The model contains invalid geometry.');components+=accessor.count;}
  if(components>30_000_000)throw new Error('This model has too much geometry for the browser viewer.');
}

async function fetchModel(url:string,signal:AbortSignal){
  const address=new URL(url,location.href);
  if(address.origin!==location.origin)throw new Error('Models must be loaded through the NEXAISLE server.');
  const response=await fetch(address,{signal,redirect:'error'});
  if(!response.ok)throw new Error(`The model could not be downloaded (HTTP ${response.status}). Check the conversion status and try opening it again.`);
  if(Number(response.headers.get('content-length'))>MAX_BYTES)throw new Error('This model exceeds the 50 MB viewer limit.');
  if(!response.body)throw new Error('The model download was empty.');
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let bytes=0;
  try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>MAX_BYTES){await reader.cancel();throw new Error('This model exceeds the 50 MB viewer limit.');}chunks.push(chunk.value);}}finally{reader.releaseLock();}
  const combined=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){combined.set(chunk,offset);offset+=chunk.byteLength;}
  validateGLB(combined.buffer);
  const manager=new THREE.LoadingManager();manager.setURLModifier(resource=>{if(resource.startsWith('blob:')||resource.startsWith('data:'))return resource;throw new Error('External model resources are not supported.');});
  const gltf=await new GLTFLoader(manager).parseAsync(combined.buffer,'');
  try{
    gltf.scene.updateMatrixWorld(true);
    let meshCount=0;const textures=new Set<THREE.Texture>();
    gltf.scene.traverse(object=>{if(object instanceof THREE.Mesh){meshCount++;object.castShadow=true;object.receiveShadow=true;for(const material of Array.isArray(object.material)?object.material:[object.material])for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);}});
    let pixels=0;for(const texture of textures){const width=Number(texture.image?.width)||0,height=Number(texture.image?.height)||0;if(width>8192||height>8192)throw new Error('The model textures are too large for the browser viewer.');pixels+=width*height;}
    if(pixels>128_000_000)throw new Error('The model textures exceed the viewer memory limit.');
    const bounds=new THREE.Box3().setFromObject(gltf.scene),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    if(!meshCount||bounds.isEmpty()||![...size.toArray(),...center.toArray()].every(Number.isFinite)||size.y<.0001)throw new Error('No visible 3D geometry was found in the model.');
    const scale=2/size.y;
    if(size.x*scale>8||size.z*scale>8)throw new Error('The model dimensions do not match a standing outfit.');
    return {scene:gltf.scene,scale,position:[-center.x*scale,-bounds.min.y*scale,-center.z*scale] as [number,number,number]};
  }catch(error){releaseModel(gltf.scene);throw error;}
}

class ViewerBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div className="model-viewer-message" role="alert">The 3D view could not start. Try a browser with WebGL enabled, or download the model to inspect it elsewhere.</div>:this.props.children;}
}

function ModelScene({model,view,turntable}:{model:FittedModel;view:View;turntable:boolean}){
  const controls=useRef<OrbitControlsImpl>(null),{camera}=useThree();
  useEffect(()=>{camera.position.set(Math.sin(view.angle)*4.2,1.15,Math.cos(view.angle)*4.2);controls.current?.target.set(0,1,0);controls.current?.update();},[camera,view]);
  return <><color attach="background" args={['#e9ebe4']}/><ambientLight intensity={1.5}/><hemisphereLight args={['#fffaf0','#79847c',1.6]}/><directionalLight position={[3,5,5]} intensity={2.5}/><directionalLight position={[-3,2,-3]} intensity={1.8}/><group scale={model.scale} position={model.position} dispose={null}><primitive object={model.scene} dispose={null}/></group><ContactShadows position={[0,-.015,0]} opacity={.3} scale={8} blur={2.5} far={4}/><OrbitControls ref={controls} makeDefault target={[0,1,0]} minDistance={1.2} maxDistance={9} enablePan={false} minPolarAngle={.12} maxPolarAngle={Math.PI-.12} autoRotate={turntable} autoRotateSpeed={.65}/></>;
}

export default function ModelViewer({url,title,onClose}:{url:string;title:string;onClose:()=>void}){
  const [model,setModel]=useState<FittedModel|null>(null),[error,setError]=useState(''),[turntable,setTurntable]=useState(false),[view,setView]=useState<View>({angle:0,revision:0});
  useEffect(()=>{const controller=new AbortController();let disposed=false,loaded:FittedModel|null=null;setModel(null);setError('');fetchModel(url,controller.signal).then(result=>{if(disposed){releaseModel(result.scene);return;}loaded=result;setModel(result);}).catch(error=>{if(!disposed)setError(error instanceof Error?error.message:'The model could not be opened.');});return()=>{disposed=true;controller.abort();if(loaded)releaseModel(loaded.scene);};},[url]);
  function angle(value:number){setTurntable(false);setView(previous=>({angle:value,revision:previous.revision+1}));}
  return <div className="model-viewer-overlay" role="dialog" aria-modal="true" aria-label="3D outfit viewer"><div className="model-viewer-panel"><header><div><span className="eyebrow">NEXAISLE / YOUR OUTFIT IN 3D</span><h2>{title}</h2></div><button autoFocus className="model-close" onClick={onClose} aria-label="Close 3D viewer"><X/></button></header><div className="model-viewer-stage">{error?<div className="model-viewer-message" role="alert"><b>The model could not be opened.</b><p>{error}</p></div>:model?<ViewerBoundary><Canvas camera={{position:[0,1.15,4.2],fov:36}} dpr={[1,1.5]} gl={{antialias:true}} fallback={<div className="model-viewer-message">Your browser does not support WebGL. Download the model to view it in a compatible application.</div>}><ModelScene model={model} view={view} turntable={turntable}/></Canvas></ViewerBoundary>:<div className="model-viewer-message" role="status">Loading your textured 3D model…</div>}</div><div className="model-viewer-toolbar" aria-label="3D view controls">{[['Front',0],['Left',-Math.PI/2],['Back',Math.PI],['Right',Math.PI/2]].map(([label,value])=><button key={label} disabled={!model||!!error} onClick={()=>angle(Number(value))}>{label}</button>)}<button disabled={!model||!!error} onClick={()=>angle(0)}><RotateCcw size={15}/> Reset view</button><button disabled={!model||!!error} aria-pressed={turntable} onClick={()=>setTurntable(value=>!value)}>{turntable?'Stop rotation':'Auto-rotate'}</button>{model&&<a href={url} download="nexaisle-outfit.glb"><Download size={15}/> Download GLB</a>}</div><p className="model-viewer-help">Drag to rotate · Scroll or pinch to zoom · View buttons work with keyboard and touch</p><p className="model-viewer-note">Estimated 3D reconstruction; hidden details and likeness may differ. View directions follow the model’s orientation, not a verified body scan.</p></div></div>;
}
