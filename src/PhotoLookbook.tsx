import {useEffect,useRef,useState} from 'react';
import {X,Upload,Sparkles,ArrowLeft} from 'lucide-react';
import type {Product} from './store';
import {atlasUrl,findPiece,railPieces,pieceProduct} from './fashion/collection';
import GarmentPhoto from './fashion/GarmentPhoto';
import './lookbook.css';

const poses=[{id:'front',name:'Front view',note:'A relaxed, full-length portrait'},{id:'turn',name:'Three-quarter',note:'A natural turn toward the camera'},{id:'walk',name:'In motion',note:'A still photograph in a walking pose'}];
type Result={pose:string;image?:string;error?:string;product:string};
async function readPhoto(file:File){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error('Choose a JPG, PNG or WebP smaller than 10 MB.');
  const bitmap=await createImageBitmap(file);
  try {const factor=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=bitmap.width*factor;canvas.height=bitmap.height*factor;canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.92);}finally{bitmap.close();}
}
async function garmentImage(id:string){
  const piece=findPiece(id);if(!piece)throw new Error('Product photography is not available for this piece.');
  const image=new Image();image.src=atlasUrl;await image.decode();
  const [l,t,r,b]=piece.crop,canvas=document.createElement('canvas');canvas.width=r-l;canvas.height=b-t;
  canvas.getContext('2d')!.drawImage(image,l,t,r-l,b-t,0,0,r-l,b-t);return canvas.toDataURL('image/png');
}
export default function PhotoLookbook({product,onClose,onLocal}:{product:Product;onClose:()=>void;onLocal:(product:Product)=>void}){
  const [selected,setSelected]=useState(product),[photo,setPhoto]=useState(''),[chosen,setChosen]=useState(['front']),[consent,setConsent]=useState(false),[available,setAvailable]=useState<boolean|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[results,setResults]=useState<Result[]>([]),[large,setLarge]=useState<Result|null>(null);
  const controller=useRef<AbortController|null>(null),dialog=useRef<HTMLElement>(null),uploadId=useRef(0),alive=useRef(true),running=useRef(false);
  useEffect(()=>{
    alive.current=true;const previous=document.activeElement as HTMLElement;dialog.current?.focus();const old=document.body.style.overflow;document.body.style.overflow='hidden';
    const status=new AbortController();fetch('/api/try-on/status',{signal:status.signal}).then(r=>r.ok?r.json():Promise.reject()).then(data=>setAvailable(data.available===true)).catch(()=>{if(!status.signal.aborted)setAvailable(false)});
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();if(e.key==='Tab'&&dialog.current){const focusRoot=dialog.current.querySelector('.lookbook-enlarged')||dialog.current;const controls=[...focusRoot.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href]')].filter(el=>el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};document.addEventListener('keydown',key);
    return()=>{alive.current=false;uploadId.current++;controller.current?.abort();status.abort();document.body.style.overflow=old;document.removeEventListener('keydown',key);previous?.focus()};
  },[]);
  async function upload(file?:File){if(!file)return;const id=++uploadId.current;setError('');try{const next=await readPhoto(file);if(alive.current&&id===uploadId.current){setPhoto(next);setResults([]);setConsent(false)}}catch(e){if(alive.current&&id===uploadId.current)setError((e as Error).message)}}
  async function generate(){
    if(running.current||!photo||!consent||!available||!chosen.length)return;
    running.current=true;setBusy(true);setError('');setResults([]);const abort=new AbortController();controller.current=abort;
    try {const garment=await garmentImage(selected.id);
      for(const pose of chosen){if(abort.signal.aborted)break;setProgress(`Creating ${poses.find(p=>p.id===pose)!.name.toLowerCase()}… This can take a few minutes.`);
        try{const response=await fetch('/api/try-on',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({person:photo,garment,pose,consent:true}),signal:abort.signal});const data=await response.json();if(!response.ok)throw new Error(data.error||'Generation failed.');if(typeof data.image!=='string'||!data.image.startsWith('data:image/png;base64,'))throw new Error('No image returned.');if(!abort.signal.aborted)setResults(old=>[...old,{pose,image:data.image,product:selected.name}]);}
        catch(e){if(abort.signal.aborted)break;setResults(old=>[...old,{pose,error:(e as Error).message,product:selected.name}]);}
      }
    }catch(e){if(!abort.signal.aborted)setError((e as Error).message)}finally{running.current=false;if(alive.current){setBusy(false);setProgress(abort.signal.aborted?'Generation stopped. Completed images are still available.':'')}}
  }
  const piece=findPiece(selected.id);
  return <div className="lookbook-backdrop"><section className="lookbook" ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label="AI photo fitting studio">
    <header><div><span className="eyebrow">NEXAISLE / THE PERSONAL EDIT</span><h2>Your own lookbook.</h2><p>One photograph. Your favourite piece. A new perspective.</p></div><button aria-label="Close photo studio" onClick={onClose}><X/></button></header>
    <div className="lookbook-layout"><div className="lookbook-source"><div className="portrait-well">{photo?<img src={photo} alt="Your full-body reference"/>:<div><Upload size={32}/><h3>Start with you.</h3><p>Upload a clear, full-body photograph with your head and feet visible, good light and your arms slightly away from your sides.</p></div>}</div><label className={'primary upload-photo '+(busy?'disabled':'')}><Upload size={17}/>{photo?'REPLACE PHOTO':'UPLOAD FULL-BODY PHOTO'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{void upload(e.target.files?.[0]);e.target.value=''}}/></label>{photo&&<button className="lookbook-text-button" disabled={busy} onClick={()=>{uploadId.current++;setPhoto('');setResults([]);setConsent(false)}}>Remove my photo</button>}<small>Your photo stays in this tab until you choose Generate. Closing the studio clears its photos and results.</small></div>
    <div className="lookbook-options"><span className="eyebrow">01 / YOUR PIECE</span><div className="lookbook-piece">{piece&&<GarmentPhoto piece={piece}/>}<div><h3>{selected.name}</h3><p>{piece?.shade}</p></div></div><div className="lookbook-garments">{railPieces.map(p=><button key={p.id} disabled={busy} aria-label={`Choose ${pieceProduct(p).name}`} aria-pressed={selected.id===p.id} onClick={()=>{setSelected(pieceProduct(p));setResults([])}}><GarmentPhoto piece={p}/></button>)}</div>
    <span className="eyebrow">02 / CHOOSE YOUR POSES</span><div className="pose-options">{poses.map(p=><label key={p.id}><input type="checkbox" disabled={busy} checked={chosen.includes(p.id)} onChange={()=>setChosen(old=>old.includes(p.id)?old.filter(id=>id!==p.id):[...old,p.id])}/><div><b>{p.name}</b><small>{p.note}</small></div></label>)}</div>
    <p className="lookbook-note">AI styling images, not a size or fit guarantee. Face details, fabric and unseen garment details may vary. These are still photographs, not video.</p>
    {available===false&&<div className="lookbook-service" role="status"><b>AI generation isn’t connected yet.</b><p>The site owner needs to add the server’s image-generation API key. You can prepare your photo here or use the local mirror.</p></div>}
    <label className="lookbook-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/><span>When I generate, send this photo and garment to OpenAI to create my chosen poses. I have permission to use the photo. Provider data policies apply.</span></label>
    <button className="primary" disabled={!available||!photo||!consent||!chosen.length||busy||!piece} onClick={()=>void generate()}><Sparkles size={18}/>{busy?'CREATING YOUR LOOKBOOK…':`GENERATE ${chosen.length} ${chosen.length===1?'LOOK':'LOOKS'}`}</button>
    {busy&&<button className="secondary" onClick={()=>controller.current?.abort()}>STOP GENERATION</button>}<p role="status" aria-live="polite">{available===null?'Checking the image service…':progress}</p>{error&&<p role="alert">{error}</p>}
    <button className="lookbook-text-button" disabled={busy} onClick={()=>onLocal(selected)}><ArrowLeft size={15}/> Use the local camera mirror</button></div></div>
    {results.length>0&&<section className="lookbook-results"><span className="eyebrow">YOUR PERSONAL EDIT / AI GENERATED</span><div>{results.map(result=><article key={result.pose}>{result.image?<><button onClick={()=>setLarge(result)} aria-label={`Enlarge ${result.pose} result`}><img src={result.image} alt={`${result.product}, ${result.pose} pose — AI generated`}/></button><h3>{poses.find(p=>p.id===result.pose)?.name}</h3><a download={`nexaisle-${result.pose}.png`} href={result.image}>Download image ↗</a></>:<p role="alert">{poses.find(p=>p.id===result.pose)?.name}: {result.error}</p>}</article>)}</div></section>}
    {large&&<div className="lookbook-enlarged"><button autoFocus onClick={()=>setLarge(null)} aria-label="Close enlarged image"><X/> Back to lookbook</button><img src={large.image} alt={`${large.product} — AI generated`}/></div>}
  </section></div>;
}
