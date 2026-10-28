import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Camera, Upload, X, RotateCcw, ArrowLeft, ShoppingBag, Move, CameraOff } from 'lucide-react';
import type { Product } from './store';
import { money } from './store';
import { findPiece, railPieces, pieceProduct } from './fashion/collection';
import GarmentPhoto from './fashion/GarmentPhoto';
import './tryon.css';

type Props={product:Product;onClose:()=>void;onAvatar:()=>void;onBack?:()=>void;onAdd?:()=>void;onSelect?:(p:Product)=>void;size?:string;onSizeChange?:(size:string)=>void};
// Photos and video stay in this component's memory. Nothing is sent to a server.
export default function TryOnStudio({product,onClose,onBack,onAdd,onSelect,onAvatar,size='M',onSizeChange}:Props) {
  const [photo,setPhoto]=useState<string|null>(null);
  const [error,setError]=useState('');
  const [cameraOn,setCameraOn]=useState(false);
  const [starting,setStarting]=useState(false);
  const [scale,setScale]=useState(100);
  const [position,setPosition]=useState({x:50,y:27});
  const [opacity,setOpacity]=useState(95);
  const video=useRef<HTMLVideoElement>(null),file=useRef<HTMLInputElement>(null),preview=useRef<HTMLDivElement>(null),dialog=useRef<HTMLElement>(null);
  const stream=useRef<MediaStream|null>(null),alive=useRef(false),request=useRef(0),reader=useRef<FileReader|null>(null);
  const drag=useRef<{x:number;y:number;startX:number;startY:number}|null>(null);
  const piece=findPiece(product.id);
  function stopCamera(){request.current++;stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;setCameraOn(false);setStarting(false)}
  function reset(){setScale(100);setOpacity(95);setPosition({x:50,y:/trousers|skirt/i.test(product.name)?48:/boots|sneakers/i.test(product.name)?72:27})}
  useEffect(()=>{reset()},[product.id]);
  useEffect(()=>{
    alive.current=true;const previous=document.activeElement as HTMLElement;dialog.current?.focus();
    const keyboard=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();onClose()}if(e.key==='Tab'&&dialog.current){const controls=Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled),input:not([hidden]):not([type="file"])'));const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};
    document.addEventListener('keydown',keyboard);
    const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    return()=>{alive.current=false;request.current++;stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;reader.current?.abort();document.removeEventListener('keydown',keyboard);document.body.style.overflow=previousOverflow;if(previous?.isConnected)previous.focus()};
  },[]);
  useEffect(()=>{if(!cameraOn||!video.current||!stream.current)return;const element=video.current;element.srcObject=stream.current;element.play().catch(()=>{if(alive.current){setError('The camera could not play. Try again or upload a photo.');stopCamera()}});return()=>{element.srcObject=null}},[cameraOn]);
  async function startCamera(){
    if(starting||cameraOn)return;
    if(!navigator.mediaDevices?.getUserMedia){setError('Camera access needs HTTPS or localhost and a supported browser. You can upload a photo instead.');return}
    setError('');setStarting(true);const id=++request.current;
    try{const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:960}},audio:false});if(!alive.current||request.current!==id){media.getTracks().forEach(track=>track.stop());return}stream.current=media;setPhoto(null);setCameraOn(true);setStarting(false);media.getVideoTracks().forEach(track=>track.addEventListener('ended',()=>{if(alive.current&&stream.current===media){setCameraOn(false);stream.current=null;setError('The camera stopped. Start it again or upload a photo.')}}))}
    catch(e){if(!alive.current||request.current!==id)return;setStarting(false);setError((e as DOMException).name==='NotAllowedError'?'Camera permission was denied. Allow camera access in your browser, or upload a photo.':'No camera could be opened. Check that it is connected and not in use, or upload a photo.')}
  }
  function capture(){const v=video.current;if(!v?.videoWidth||!v.videoHeight){setError('The camera is still warming up. Try again in a moment.');return}const canvas=document.createElement('canvas'),factor=Math.min(1,1200/v.videoWidth);canvas.width=v.videoWidth*factor;canvas.height=v.videoHeight*factor;const ctx=canvas.getContext('2d')!;ctx.translate(canvas.width,0);ctx.scale(-1,1);ctx.drawImage(v,0,0,canvas.width,canvas.height);setPhoto(canvas.toDataURL('image/jpeg',.9));stopCamera();setError('')}
  function upload(event:React.ChangeEvent<HTMLInputElement>){const selected=event.target.files?.[0];if(!selected)return;event.target.value='';if(!selected.type.startsWith('image/')){setError('Choose a JPG, PNG or another supported image.');return}if(selected.size>10*1024*1024){setError('Choose an image smaller than 10 MB.');return}reader.current?.abort();const next=new FileReader();reader.current=next;next.onload=()=>{if(!alive.current||reader.current!==next)return;const image=new Image();image.onload=()=>{if(alive.current&&reader.current===next){stopCamera();setPhoto(next.result as string);setError('')}};image.onerror=()=>{if(alive.current)setError('That image could not be opened. Try a JPG or PNG.')};image.src=next.result as string};next.onerror=()=>{if(alive.current)setError('The photo could not be read. Please try another file.')};next.readAsDataURL(selected)}
  function beginDrag(e:PointerEvent<HTMLDivElement>){if(!preview.current)return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,startX:position.x,startY:position.y}}
  function moveDrag(e:PointerEvent<HTMLDivElement>){if(!drag.current||!preview.current)return;const bounds=preview.current.getBoundingClientRect();setPosition({x:Math.max(5,Math.min(95,drag.current.startX+(e.clientX-drag.current.x)/bounds.width*100)),y:Math.max(0,Math.min(90,drag.current.startY+(e.clientY-drag.current.y)/bounds.height*100))})}
  const baseWidth=/boots|sneakers|trousers|skirt/i.test(product.name)?35:52;
  return <div className="mirror-backdrop" onClick={onClose}><section ref={dialog} tabIndex={-1} className="mirror-dialog" role="dialog" aria-modal="true" aria-label="Virtual style mirror" onClick={e=>e.stopPropagation()}>
    <div className="mirror-header"><div><span>NEXAISLE / YOUR PERSONAL FITTING ROOM</span><h2>A little more <em>you.</em></h2></div><button aria-label="Close style mirror" onClick={onClose}><X size={22}/></button></div>
    <div className="mirror-layout"><div className="mirror-stage" ref={preview}>
      {cameraOn?<video ref={video} autoPlay playsInline muted className="mirror-media live" aria-label="Live camera view"/>:photo?<img className="mirror-media" src={photo} alt="Your local photo"/>:<div className="mirror-empty"><div className="mirror-outline"/><Camera size={30}/><h3>Make room for your next look.</h3><p>Turn on your camera or choose a photo.<br/>Your selected garment appears over you.</p><button className="primary" disabled={starting} onClick={startCamera}><Camera size={15}/>{starting?'OPENING CAMERA…':'USE CAMERA'}</button><button className="mirror-upload-link" onClick={()=>file.current?.click()}>OR UPLOAD A PHOTO <Upload size={12}/></button></div>}
      {(cameraOn||photo)&&piece&&<div className="mirror-garment" role="img" aria-label={'Try-on overlay: '+product.name} style={{left:position.x+'%',top:position.y+'%',width:baseWidth*scale/100+'%',opacity:opacity/100}} onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}} onLostPointerCapture={()=>{drag.current=null}}><GarmentPhoto piece={piece}/></div>}
      {(cameraOn||photo)&&<div className="mirror-drag-hint"><Move size={12}/> DRAG THE GARMENT TO POSITION IT</div>}
      <div className="mirror-privacy"><span/> {cameraOn?'LIVE CAMERA / MIRRORED':'LOCAL PREVIEW'} · NOTHING IS UPLOADED</div>
    </div><div className="mirror-tools"><div className="mirror-selected">{piece&&<GarmentPhoto piece={piece}/>}<div><span>YOUR SELECTED PIECE</span><h3>{product.name}</h3><p>{piece?.shade} · {money(product.price)} · Size {size}</p></div></div>
      <p className="mirror-description">Preview the actual garment image on your live camera or photo. Adjust it until the shoulders line up. This is a visual styling overlay, not body tracking or an accurate size and fit simulation.</p>
      <input ref={file} type="file" accept="image/*" onChange={upload} hidden aria-label="Upload try-on photo"/>
      <div className="mirror-actions"><button className="primary" disabled={starting} onClick={cameraOn?capture:startCamera}><Camera size={15}/>{starting?'OPENING…':cameraOn?'FREEZE PHOTO':'USE CAMERA'}</button><button className="secondary" onClick={()=>file.current?.click()}><Upload size={14}/> UPLOAD PHOTO</button></div>
      {(cameraOn||starting)&&<button className="mirror-stop" onClick={stopCamera}><CameraOff size={12}/> STOP CAMERA</button>}
      {error&&<p className="mirror-error" role="alert">{error}</p>}
      {!piece&&<p className="mirror-error">Try-on imagery is not available for this archived piece.</p>}
      <div className="mirror-adjustments">{onSizeChange&&<div className="mirror-size-selection"><span>SELECTED CLOTHING SIZE</span><div>{['XS','S','M','L','XL'].map(s=><button key={s} aria-label={'Choose size '+s} aria-pressed={size===s} onClick={()=>onSizeChange(s)}>{s}</button>)}</div></div>}<span>MAKE IT YOURS</span><label>Overlay scale <b>{scale}%</b><input aria-label="Overlay scale" type="range" min="45" max="180" value={scale} onChange={e=>setScale(Number(e.target.value))}/></label><label>Left / right <b>{Math.round(position.x)}%</b><input aria-label="Horizontal position" type="range" min="5" max="95" value={position.x} onChange={e=>setPosition(p=>({...p,x:Number(e.target.value)}))}/></label><label>Up / down <b>{Math.round(position.y)}%</b><input aria-label="Vertical position" type="range" min="0" max="90" value={position.y} onChange={e=>setPosition(p=>({...p,y:Number(e.target.value)}))}/></label><label>Opacity <b>{opacity}%</b><input aria-label="Garment opacity" type="range" min="30" max="100" value={opacity} onChange={e=>setOpacity(Number(e.target.value))}/></label><button onClick={reset}><RotateCcw size={12}/> RESET POSITION</button></div>
      {onSelect&&<div className="mirror-switch"><span>ANOTHER PERSPECTIVE</span><div>{railPieces.map(p=><button key={p.id} aria-label={'Try on '+pieceProduct(p).name} aria-pressed={product.id===p.id} onClick={()=>onSelect(pieceProduct(p))}><GarmentPhoto piece={p}/></button>)}</div></div>}
      <div className="mirror-footer">{onBack&&<button className="secondary" onClick={onBack}><ArrowLeft size={14}/> BACK TO PRODUCT</button>}{onAdd&&<button className="primary" onClick={onAdd}><ShoppingBag size={14}/> ADD TO BAG</button>}</div><button className="mirror-avatar-link" onClick={onAvatar}>APPLY SHADE TO MY AVATAR ↗</button>
    </div></div>
  </section></div>;
}
