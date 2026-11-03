import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Camera,Upload,X,Sparkles,Download,RotateCcw,LoaderCircle} from 'lucide-react';
import type {LightingPiece} from './lightingCollection';
import './roomStudio.css';
import RoomLightPreview,{type RoomLightControls} from './RoomLightPreview';

const rooms=[['dining','Dining Room'],['living','Living Room'],['kids',"Kids’ Room"],['bedroom','Bedroom'],['kitchen','Kitchen'],['study','Study Room'],['my','My Own Room (AI Camera)']] as const;
type Result={image:string;original?:string};
type Point={x:number;y:number};
export type StudioScene={image:string;name:string};
async function photoData(blob:Blob):Promise<string>{
 if(!['image/jpeg','image/png','image/webp'].includes(blob.type))throw Error('Choose a JPG, PNG or WEBP photograph.');
 if(blob.size>15*1024*1024)throw Error('Please choose a photo smaller than 15 MB.');
 const bitmap=await createImageBitmap(blob,{imageOrientation:'from-image'});
 try{const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext('2d');if(!ctx)throw Error('Photo processing is unavailable.');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.9);}finally{bitmap.close();}
}
export default function RoomStudio({piece,children,light}:{piece:LightingPiece;light:RoomLightControls;children:(scene?:StudioScene)=>ReactNode}){
 const [room,setRoom]=useState('dining'),[cache,setCache]=useState<Record<string,Result>>({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const [open,setOpen]=useState(false),[photo,setPhoto]=useState(''),[photoVersion,setPhotoVersion]=useState(0),[consent,setConsent]=useState(false),[point,setPoint]=useState<Point|undefined>(),[split,setSplit]=useState(50);
 const [camera,setCamera]=useState(false),[cameraPending,setCameraPending]=useState(false),[cameraError,setCameraError]=useState(''),[provider,setProvider]=useState('configured image provider');
 const dialog=useRef<HTMLDialogElement>(null),video=useRef<HTMLVideoElement>(null),file=useRef<HTMLInputElement>(null),stream=useRef<MediaStream|null>(null),cameraToken=useRef(0),controller=useRef<AbortController|null>(null),serial=useRef(0),mounted=useRef(true);
 const key=`${piece.id}:${room}:${room==='my'?photoVersion:0}`,result=cache[key];
 const roomName=rooms.find(([id])=>id===room)?.[1]||'Room';
 function stopCamera(){cameraToken.current++;stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;setCamera(false);setCameraPending(false);}
 function cancel(){serial.current++;controller.current?.abort();controller.current=null;setBusy(false);}
 function close(){stopCamera();setOpen(false);}
 useEffect(()=>{mounted.current=true;fetch('/api/try-on/status').then(r=>r.ok?r.json():null).then(s=>{if(s?.provider&&mounted.current)setProvider(s.provider)}).catch(()=>{});return()=>{mounted.current=false;serial.current++;controller.current?.abort();cameraToken.current++;stream.current?.getTracks().forEach(t=>t.stop());};},[]);
 useEffect(()=>{if(open)fetch('/api/try-on/status').then(r=>r.ok?r.json():null).then(s=>{if(s?.provider&&mounted.current)setProvider(s.provider)}).catch(()=>{});},[open]);
 useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal();if(!open&&dialog.current?.open)dialog.current.close();},[open]);
 useEffect(()=>{if(camera&&video.current&&stream.current){video.current.srcObject=stream.current;void video.current.play().catch(()=>setCameraError('Press play in the camera preview, or upload a photograph.'));}},[camera]);
 async function generate(targetKey:string,targetRoom:string,original?:string,regenerate=false){
  cancel();const request=++serial.current,abort=new AbortController();controller.current=abort;setBusy(true);setError('');
  try{const response=await fetch('/api/lighting/render',{method:'POST',headers:{'Content-Type':'application/json'},signal:abort.signal,body:JSON.stringify({productId:piece.id,room:targetRoom,photo:original,regenerate,consent:original?consent:true,position:original?point:undefined})});const data=await response.json();if(!response.ok)throw Error(data.error||'Room generation failed.');if(typeof data.image!=='string'||!data.image.startsWith('data:image/'))throw Error('The image service did not return a room image.');if(request===serial.current&&mounted.current)setCache(previous=>({...previous,[targetKey]:{image:data.image,original}}));}
  catch(e){if(request===serial.current&&mounted.current&&!abort.signal.aborted)setError(e instanceof Error?e.message:'Could not generate this room. Please try again.');}
  finally{if(request===serial.current&&mounted.current){setBusy(false);controller.current=null;}}
 }
 // Each product/room has its own result. Never show a previous lamp or room as the newly selected one.
 useEffect(()=>{cancel();setError('');if(room!=='dining'&&room!=='my'&&!cache[key])void generate(key,room);return()=>{serial.current++;controller.current?.abort();};},[key,retry]);
 function selectRoom(value:string){setRoom(value);if(value==='my')setOpen(true);}
 async function usePhoto(blob:Blob){try{const data=await photoData(blob);if(!mounted.current)return;cancel();stopCamera();setPhoto(data);setPhotoVersion(v=>v+1);setPoint(undefined);setError('');setCameraError('');setRoom('my');}catch(e){setCameraError(e instanceof Error?e.message:'Cannot read this photograph.');}}
 async function startCamera(){
  stopCamera();setCameraError('');const token=++cameraToken.current;setCameraPending(true);
  try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera access is unavailable in this browser. You can upload a photograph instead.');const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});if(token!==cameraToken.current||!mounted.current){media.getTracks().forEach(t=>t.stop());return;}stream.current=media;setCamera(true);}
  catch(e){if(token===cameraToken.current)setCameraError(e instanceof DOMException&&e.name==='NotAllowedError'?'Camera permission was denied. Allow camera access in your browser, or upload a photograph.':e instanceof Error?e.message:'No camera was found. Upload a photograph instead.');}
  finally{if(token===cameraToken.current)setCameraPending(false);}
 }
 async function capture(){const v=video.current;if(!v?.videoWidth){setCameraError('The camera is still starting. Please try again.');return;}const canvas=document.createElement('canvas');canvas.width=v.videoWidth;canvas.height=v.videoHeight;canvas.getContext('2d')?.drawImage(v,0,0);canvas.toBlob(blob=>{if(blob)void usePhoto(blob);else setCameraError('Could not capture the photo. Please try again.');},'image/jpeg',.9);}
 function download(){if(!result)return;const a=document.createElement('a');a.href=result.image;a.download=`nexaisle-${piece.id}-${room}-visualisation.png`;a.click();}
 return <>
  <div className="lighting-room-tools"><label>SET YOUR SCENE<select aria-label="Room scenario" value={room} onChange={e=>selectRoom(e.target.value)}>{rooms.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><button className="room-try-button" onClick={()=>{setRoom('my');setOpen(true)}}><Camera size={15}/>📷 Try in My Room</button></div>
  {room==='dining'?children():result?children({image:result.image,name:roomName}):<div className="room-preparing-stage">{children()}<div className="room-current-caption">Original IKEA room · {roomName} preview is not ready yet</div><div className="room-empty" aria-live="polite" aria-busy={busy}>{busy?<LoaderCircle className="room-spin" size={30}/>:<Sparkles size={30}/>}<h3>{busy?`Creating your ${roomName.toLowerCase()}…`:room==='my'?'A familiar room. A new light.':`Imagine ${piece.name} in the ${roomName.toLowerCase()}.`}</h3><p>{busy?`Matching ${piece.name} from the original IKEA reference. We’re preparing this scene once; later visits reuse it.`:room==='my'?'Take or upload a photo to see this IKEA design in your space.':error||'Create a distinct room with your selected IKEA lamp.'}</p>{busy?<button onClick={cancel}>Cancel generation</button>:room==='my'?<button onClick={()=>setOpen(true)}>Choose my room photo</button>:<button onClick={()=>setRetry(v=>v+1)}>Try again</button>}</div></div>}
  {result&&room!=='dining'&&<div className="room-result-strip"><span>AI visualisation · approximate product likeness. Day/night and ON/OFF are illustrative previews.</span><button onClick={()=>setOpen(true)}>Compare & download</button></div>}
  <dialog ref={dialog} className="room-dialog" onCancel={e=>{e.preventDefault();close()}} onClick={e=>{if(e.target===e.currentTarget)close()}} aria-labelledby="room-dialog-title">
   <div className="room-modal"><header><div><span className="eyebrow">YOUR SPACE, REIMAGINED</span><h2 id="room-dialog-title">Try in <em>my room.</em></h2></div><button className="room-close" onClick={close} aria-label="Close room camera"><X size={21}/></button></header>
    <div className="room-product"><img src={piece.image} alt={piece.name}/><span><b>{piece.name}</b><small>{piece.subtitle} · original IKEA reference</small></span></div>
    <p className="room-modal-intro">One new light. Still your room. Keep your walls, furniture and colours, with an IKEA design placed in perspective.</p>
    <div className="room-input-actions"><button disabled={busy||cameraPending} onClick={()=>void startCamera()}><Camera size={18}/>{cameraPending?'Opening camera…':'Take a Photo'}</button><button disabled={busy} onClick={()=>file.current?.click()}><Upload size={18}/>Upload a Photo</button></div>
    <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void usePhoto(f);e.target.value=''}}/>
    {cameraError&&<p className="room-error" role="alert">{cameraError}</p>}
    {camera&&<div className="room-camera"><video ref={video} autoPlay playsInline muted controls/><div><button onClick={()=>void capture()}>Capture room</button><button onClick={stopCamera}>Close camera</button></div></div>}
    {result?<>
     <RoomLightPreview image={result.image} original={result.original} name={piece.name} category={piece.category} split={split} setSplit={setSplit} position={point} light={light}/>
     <div className="room-output-actions"><button disabled={busy||!!result.original&&!consent} onClick={()=>void generate(key,room,result.original,true)}><RotateCcw size={15}/>Regenerate</button>{result.original&&<button disabled={busy} onClick={()=>{setPhoto(result.original!);setCache(previous=>{const next={...previous};delete next[key];return next;});}}>Adjust placement</button>}<button onClick={download}><Download size={15}/>Download Image</button><button disabled={busy} onClick={()=>{cancel();setCache(prev=>{const next={...prev};delete next[key];return next});setPhoto('');setPhotoVersion(v=>v+1);setRoom('my');setPoint(undefined);}}>Try Another Room</button></div>
    </>:photo&&room==='my'?<><div className="room-photo-target" onClick={e=>{if(busy)return;const rect=e.currentTarget.getBoundingClientRect();setPoint({x:Math.round((e.clientX-rect.left)/rect.width*100),y:Math.round((e.clientY-rect.top)/rect.height*100)});}}><img src={photo} alt="Your room photograph"/>{point&&<span style={{left:`${point.x}%`,top:`${point.y}%`}}>+</span>}</div><p className="room-hint">Optional: tap the photo to suggest where the lamp should go. AI will match the installation and perspective.</p><button className="room-clear-point" disabled={busy} onClick={()=>{setPhoto('');setPhotoVersion(v=>v+1);setPoint(undefined);}}>Remove photo</button>{point&&<button className="room-clear-point" disabled={busy} onClick={()=>setPoint(undefined)}>Use automatic placement</button>}</>:<div className="room-upload-hint"><Camera size={28}/><p>A wide view works best.<br/>Include the ceiling for pendants, or a table for desk lamps.</p><small>JPG, PNG or WEBP · up to 15 MB</small></div>}
    {room==='my'&&<label className="room-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/><span>I agree to send this room photo to {provider} to create this visualisation. Photos are not saved by the Next Aisle server.</span></label>}
    {busy&&<p className="room-progress" role="status"><LoaderCircle size={16} className="room-spin"/>Matching perspective, materials and light…</p>}
    {error&&<p className="room-error" role="alert">{error}</p>}
    {room==='my'&&photo&&!result&&<button className="room-generate" disabled={!consent||busy} onClick={()=>void generate(key,'my',photo)}><Sparkles size={17}/>{busy?'Generating your room…':'✨ Generate My Room'}</button>}
    {busy&&<button className="room-clear-point" onClick={cancel}>Cancel generation</button>}
    <p className="room-approximation">AI uses the actual product photo as a reference. Exact lamp identity, dimensions and installation cannot be guaranteed; all generated results are approximate visualisations. Day/night controls simulate atmosphere on screen. To reposition the lamp, choose a placement point and generate again.</p>
   </div>
  </dialog>
 </>;
}
