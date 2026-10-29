import OutfitModel from './OutfitModel';
import {useCallback,useEffect,useRef,useState} from 'react';
import {X,Upload,Sparkles,ArrowLeft} from 'lucide-react';
import type {Product} from './store';
import {findPiece,railPieces,pieceProduct} from './fashion/collection';
import GarmentPhoto from './fashion/GarmentPhoto';
import './lookbook.css';
import {fitting,decodeFittingImage} from './fashion/fittingClient';
import {usePersonalAvatar,readAvatarPhoto,fitKey,cachedFit} from './personalAvatar';

const poses=[{id:'front',name:'Front view',note:'A relaxed, full-length portrait'},{id:'turn',name:'Three-quarter',note:'A natural turn toward the camera'},{id:'walk',name:'In motion',note:'A still photograph in a walking pose'}];
type Result={pose:string;image?:string;error?:string;product:string};
export default function PhotoLookbook({product,onClose,onLocal}:{product:Product;onClose:()=>void;onLocal:(product:Product)=>void}){
  const avatar=usePersonalAvatar();
  const [model,setModel]=useState('');
  const [provider,setProvider]=useState('the configured image provider');
  const [selected,setSelected]=useState(product),[photo,setPhoto]=useState(()=>usePersonalAvatar.getState().photo),[chosen,setChosen]=useState(['front']),[consent,setConsent]=useState(false),[available,setAvailable]=useState<boolean|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[results,setResults]=useState<Result[]>([]),[large,setLarge]=useState<Result|null>(null);
  const [modelTasks,setModelTasks]=useState<Record<string,boolean>>({});
  const modelActivity=useCallback((id:string,active:boolean)=>setModelTasks(current=>current[id]===active?current:{...current,[id]:active}),[]);
  const modelsRunning=Object.values(modelTasks).some(Boolean),locked=busy||modelsRunning;
  const modelsRunningRef=useRef(false);modelsRunningRef.current=modelsRunning;
  function closeStudio(){if(modelsRunningRef.current&&!window.confirm('A paid 3D conversion is still running. Closing this studio loses its local progress and will not cancel the Meshy task. Close anyway?'))return;onClose()}
  const controller=useRef<AbortController|null>(null),dialog=useRef<HTMLElement>(null),uploadId=useRef(0),alive=useRef(true),running=useRef(false);
  useEffect(()=>{
    alive.current=true;const previous=document.activeElement as HTMLElement;dialog.current?.focus();const old=document.body.style.overflow;document.body.style.overflow='hidden';
    const status=new AbortController();fetch('/api/try-on/status',{signal:status.signal}).then(r=>r.ok?r.json():Promise.reject()).then(data=>{setAvailable(data.available===true);setModel(data.model||'');setProvider(data.provider==='ZaoAPI'?'ZaoAPI':data.provider==='OpenAI'?'OpenAI':'the configured image provider')}).catch(()=>{if(!status.signal.aborted)setAvailable(false)});
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){const modelClose=dialog.current?.querySelector<HTMLButtonElement>('.model-viewer-overlay button[aria-label="Close 3D viewer"]');if(modelClose){e.preventDefault();modelClose.click();return}closeStudio();}if(e.key==='Tab'&&dialog.current){const focusRoot=dialog.current.querySelector('.model-viewer-overlay')||dialog.current.querySelector('.lookbook-enlarged')||dialog.current;const controls=[...focusRoot.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href]')].filter(el=>el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};document.addEventListener('keydown',key);
    return()=>{alive.current=false;uploadId.current++;controller.current?.abort();status.abort();document.body.style.overflow=old;document.removeEventListener('keydown',key);previous?.focus()};
  },[]);
  useEffect(()=>{setPhoto(avatar.photo);setResults([]);setLarge(null);setConsent(false);controller.current?.abort()},[avatar.revision]);
  async function upload(file?:File){if(!file)return;const id=++uploadId.current;setError('');try{const next=await readAvatarPhoto(file);if(alive.current&&id===uploadId.current){avatar.set(next.photo,next.width,next.height);setPhoto(next.photo);setResults([]);setConsent(false)}}catch(e){if(alive.current&&id===uploadId.current)setError((e as Error).message)}}
  async function generate(){
    if(modelsRunningRef.current||running.current||!photo||!consent||!available||!chosen.length)return;
    running.current=true;setBusy(true);setError('');const abort=new AbortController();controller.current=abort;
    try {const revision=avatar.revision;
      for(const pose of chosen){if(abort.signal.aborted)break;const key=fitKey(revision,selected.id,pose,provider,model),existing=cachedFit(key);if(existing){setResults(old=>[...old.filter(result=>result.pose!==pose),{pose,image:existing,product:selected.name}]);continue}setProgress(`Creating ${poses.find(p=>p.id===pose)!.name.toLowerCase()}… This can take a few minutes.`);
        try{if(fitting.failure(key))fitting.retry(key);const data=await fitting.request({key,photo,revision,garmentId:selected.id,garmentName:selected.name,pose,provider,model},abort.signal);await decodeFittingImage(data.image);if(!abort.signal.aborted&&usePersonalAvatar.getState().revision===revision)setResults(old=>[...old.filter(result=>result.pose!==pose),{pose,image:data.image,product:selected.name}]);}
        catch(e){if(abort.signal.aborted)break;setResults(old=>[...old,{pose,error:(e as Error).message,product:selected.name}]);}
      }
    }catch(e){if(!abort.signal.aborted)setError((e as Error).message)}finally{running.current=false;if(alive.current){setBusy(false);setProgress(abort.signal.aborted?'Generation stopped. Completed images are still available.':'')}}
  }
  const piece=findPiece(selected.id);
  return <div className="lookbook-backdrop"><section className="lookbook" ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label="AI photo fitting studio">
    <header><div><span className="eyebrow">NEXAISLE / THE PERSONAL EDIT</span><h2>Your own lookbook.</h2><p>One photograph. Your favourite piece. A new perspective.</p></div><button aria-label="Close photo studio" onClick={closeStudio}><X/></button></header>
    <div className="lookbook-layout"><div className="lookbook-source"><div className="portrait-well">{photo?<img src={photo} alt="Your full-body reference"/>:<div><Upload size={32}/><h3>Start with you.</h3><p>Upload a clear, full-body photograph with your head and feet visible, good light and your arms slightly away from your sides.</p></div>}</div><label className={'primary upload-photo '+(locked?'disabled':'')}><Upload size={17}/>{photo?'REPLACE PHOTO':'UPLOAD FULL-BODY PHOTO'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={locked} onChange={e=>{void upload(e.target.files?.[0]);e.target.value=''}}/></label>{photo&&<button className="lookbook-text-button" disabled={locked} onClick={()=>{uploadId.current++;avatar.clear();setPhoto('');setResults([]);setConsent(false)}}>Remove my photo</button>}<small>Your shared photo and up to sixteen AI results stay in this tab’s memory. Closing or reloading the tab clears them. Remove your photo to delete the cached fits too.</small></div>
    <div className="lookbook-options"><span className="eyebrow">01 / YOUR PIECE</span><div className="lookbook-piece">{piece&&<GarmentPhoto piece={piece}/>}<div><h3>{selected.name}</h3><p>{piece?.shade}</p></div></div><div className="lookbook-garments">{railPieces.map(p=><button key={p.id} disabled={locked} aria-label={`Choose ${pieceProduct(p).name}`} aria-pressed={selected.id===p.id} onClick={()=>{setSelected(pieceProduct(p));setResults([])}}><GarmentPhoto piece={p}/></button>)}</div>
    <span className="eyebrow">02 / CHOOSE YOUR POSES</span><div className="pose-options">{poses.map(p=><label key={p.id}><input type="checkbox" disabled={locked} checked={chosen.includes(p.id)} onChange={()=>setChosen(old=>old.includes(p.id)?old.filter(id=>id!==p.id):[...old,p.id])}/><div><b>{p.name}</b><small>{p.note}</small></div></label>)}</div>
    <p className="lookbook-note">AI styling images, not a size or fit guarantee. Face details, fabric and unseen garment details may vary. These are still photographs, not video.</p>
    {available===false&&<div className="lookbook-service" role="status"><b>AI generation isn’t connected yet.</b><p>The site owner needs to add the server’s image-generation API key. You can prepare your photo here or use the local mirror.</p></div>}
    <label className="lookbook-consent"><input type="checkbox" checked={consent} disabled={locked} onChange={e=>setConsent(e.target.checked)}/><span>When I generate, send this photo and garment to {provider} to create my chosen poses. I have permission to use the photo. Provider data policies apply.</span></label>
    <button className="primary" disabled={!available||!photo||!consent||!chosen.length||locked||!piece} onClick={()=>void generate()}><Sparkles size={18}/>{busy?'CREATING YOUR LOOKBOOK…':`GENERATE ${chosen.length} ${chosen.length===1?'LOOK':'LOOKS'}`}</button>
    {busy&&<button className="secondary" onClick={()=>controller.current?.abort()}>STOP GENERATION</button>}<p role="status" aria-live="polite">{available===null?'Checking the image service…':progress}</p>{error&&<p role="alert">{error}</p>}
    <button className="lookbook-text-button" disabled={locked} onClick={()=>onLocal(selected)}><ArrowLeft size={15}/> Use the local camera mirror</button></div></div>
    {results.length>0&&<section className="lookbook-results"><span className="eyebrow">YOUR PERSONAL EDIT / AI GENERATED</span><div>{results.map(result=><article key={result.pose}>{result.image?<><button onClick={()=>setLarge(result)} aria-label={`Enlarge ${result.pose} result`}><img src={result.image} alt={`${result.product}, ${result.pose} pose — AI generated`}/></button><h3>{poses.find(p=>p.id===result.pose)?.name}</h3><a download={`nexaisle-${result.pose}.png`} href={result.image}>Download image ↗</a><OutfitModel image={result.image} title={result.product} activityId={result.pose} onActivity={modelActivity} otherActive={modelsRunning&&!modelTasks[result.pose]}/></>:<p role="alert">{poses.find(p=>p.id===result.pose)?.name}: {result.error}</p>}</article>)}</div></section>}
    {large&&<div className="lookbook-enlarged"><button autoFocus onClick={()=>setLarge(null)} aria-label="Close enlarged image"><X/> Back to lookbook</button><img src={large.image} alt={`${large.product} — AI generated`}/></div>}
  </section></div>;
}
