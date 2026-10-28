import { useEffect, useRef, useState } from 'react';
import { Camera, Upload, X, RotateCcw, Shirt } from 'lucide-react';
import type { Product } from './store';
import { fashionImage } from './fashionMedia';

type Props = { product: Product; onClose: () => void; onAvatar: () => void };

/**
 * Privacy-first, client-only style mirror.
 * This is an adjustable styling overlay, not body scanning or accurate fitting.
 * No selfies, camera frames or biometric templates are sent to a server.
 */
export default function TryOnStudio({product,onClose,onAvatar}:Props) {
 const [photo,setPhoto] = useState<string|null>(null);
 const [error,setError] = useState('');
 const [cameraOn,setCameraOn] = useState(false);
 const [scale,setScale] = useState(100);
 const [offset,setOffset] = useState(0);
 const [opacity,setOpacity] = useState(85);
 const video = useRef<HTMLVideoElement>(null);
 const stream = useRef<MediaStream|null>(null);
 const file = useRef<HTMLInputElement>(null);
 const stop = () => {stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;setCameraOn(false)};
 useEffect(()=>()=>{stream.current?.getTracks().forEach(track=>track.stop())},[]);
 async function startCamera() {
  setError('');
  if (!navigator.mediaDevices?.getUserMedia) {setError('This browser cannot access a camera. Upload a photo instead.');return}
  try {
   const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
   stream.current=s;setCameraOn(true);
   requestAnimationFrame(()=>{if(video.current){video.current.srcObject=s;video.current.play().catch(()=>setError('Could not start the camera preview.'))}});
  } catch {setError('Camera permission was not granted. You can upload a photo instead.')}
 }
 function capture() {
  const v=video.current;if(!v||!v.videoWidth)return;
  const canvas=document.createElement('canvas');
  const factor=Math.min(1,960/v.videoWidth);
  canvas.width=v.videoWidth*factor;canvas.height=v.videoHeight*factor;
  canvas.getContext('2d')?.drawImage(v,0,0,canvas.width,canvas.height);
  setPhoto(canvas.toDataURL('image/jpeg',.84));stop();
 }
 function upload(e:React.ChangeEvent<HTMLInputElement>) {
  const f=e.target.files?.[0];if(!f)return;
  if(!f.type.startsWith('image/')){setError('Select an image file.');return}
  if(f.size>10*1024*1024){setError('Choose a photo smaller than 10 MB.');return}
  stop();setError('');
  const reader=new FileReader();
  reader.onload=()=>setPhoto(typeof reader.result==='string'?reader.result:null);
  reader.onerror=()=>setError('Unable to read this photo.');
  reader.readAsDataURL(f);
 }
 const isDress=/dress|skirt/i.test(product.name);
 const isBottom=/trousers|skirt/i.test(product.name);
 const isShoes=/sneakers|boots/i.test(product.name);
 return <div className="tryon-backdrop" onClick={onClose}>
  <section className="tryon-dialog" role="dialog" aria-modal="true" aria-label="Virtual style mirror" onClick={e=>e.stopPropagation()}>
   <header className="tryon-header"><div><small>NEXAISLE / LEVEL 02 / STYLE MIRROR</small><h2>See it on you<span>.</span></h2><p>Explore a look before you add it to your bag.</p></div><button className="tryon-close" onClick={()=>{stop();onClose()}} aria-label="Close style mirror"><X size={21}/></button></header>
   <div className="tryon-grid">
    <div className="tryon-preview">
     {cameraOn?<video ref={video} autoPlay playsInline muted className="tryon-photo" aria-label="Live camera view"/>:photo?<img src={photo} className="tryon-photo" alt="Your locally uploaded style preview"/>:<div className="tryon-empty"><Camera size={34}/><b>Your photo goes here</b><small>Use an upper-body photo with your shoulders visible for a better overlay.</small></div>}
     {(photo&&!cameraOn)&&<div className={'tryon-overlay-garment '+(isDress?'long':'')+' '+(isBottom?'bottom':'')+' '+(isShoes?'footwear':'')} style={{backgroundColor:product.color,opacity:opacity/100,transform:`translate(-50%, ${offset}px) scale(${scale/100})`}}><span>{product.name}</span></div>}
     <div className="tryon-privacy">LOCAL PREVIEW · PHOTO NOT UPLOADED</div>
    </div>
    <div className="tryon-options">
     <div className="tryon-product"><img src={fashionImage(product.id)} alt="Editorial fashion photography, not an exact product photograph"/><div><small>YOUR SELECTED LOOK</small><h3>{product.name}</h3><span>Styling image is illustrative, not this exact demo SKU.</span></div></div>
     <p className="tryon-note">This is a basic adjustable colour-and-shape styling overlay, <b>not AI body scanning or an accurate size/fit simulation.</b> Your image stays in this browser session.</p>
     <input ref={file} type="file" accept="image/*" onChange={upload} hidden/>
     <div className="tryon-actions"><button className="primary" onClick={()=>file.current?.click()}><Upload size={16}/> UPLOAD PHOTO</button>{cameraOn?<button className="secondary" onClick={capture}><Camera size={16}/> TAKE PHOTO</button>:<button className="secondary" onClick={startCamera}><Camera size={16}/> USE CAMERA</button>}</div>
     {cameraOn&&<button className="tryon-link" onClick={stop}>Cancel camera</button>}
     {error&&<p role="alert" className="tryon-error">{error}</p>}
     <div className="tryon-sliders">
      <label>OVERLAY SCALE <b>{scale}%</b><input type="range" min="65" max="145" value={scale} onChange={e=>setScale(Number(e.target.value))}/></label>
      <label>VERTICAL ALIGNMENT <b>{offset}px</b><input type="range" min="-120" max="120" value={offset} onChange={e=>setOffset(Number(e.target.value))}/></label>
      <label>OPACITY <b>{opacity}%</b><input type="range" min="30" max="100" value={opacity} onChange={e=>setOpacity(Number(e.target.value))}/></label>
     </div>
     <div className="tryon-footer"><button onClick={()=>{setScale(100);setOffset(0);setOpacity(85)}}><RotateCcw size={15}/> RESET OVERLAY</button><button onClick={onAvatar}><Shirt size={16}/> TRY COLOUR ON 3D AVATAR</button></div>
    </div>
   </div>
  </section>
 </div>;
}
