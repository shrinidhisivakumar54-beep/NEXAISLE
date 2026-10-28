import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {Box,RefreshCw} from 'lucide-react';
import './outfit-model.css';

const ModelViewer=lazy(()=>import('./ModelViewer'));
type Job={id:string;status:string;progress:number;error?:string};
async function readResponse(response:Response){
  const text=await response.text();
  let data;
  try{data=JSON.parse(text)}catch{throw new Error(`The 3D server returned no readable response (HTTP ${response.status}). Check the server terminal and Meshy task history before submitting again.`)}
  if(!response.ok)throw new Error(data?.error||`3D request failed (HTTP ${response.status}).`);
  return data;
}
export default function OutfitModel({image,title,activityId,onActivity,otherActive}:{image:string;title:string;activityId:string;onActivity:(id:string,active:boolean)=>void;otherActive:boolean}){
  const [expanded,setExpanded]=useState(false),[available,setAvailable]=useState<boolean|null>(null),[consent,setConsent]=useState(false),[creating,setCreating]=useState(false),[error,setError]=useState(''),[job,setJob]=useState<Job|null>(null),[viewer,setViewer]=useState(false),[check,setCheck]=useState(0),[paused,setPaused]=useState(false);
  const alive=useRef(true),pending=useRef(false),createController=useRef<AbortController|null>(null),openButton=useRef<HTMLButtonElement>(null);
  const active=job&&['PENDING','IN_PROGRESS'].includes(job.status);
  useEffect(()=>{onActivity(activityId,creating||!!active);return()=>onActivity(activityId,false)},[activityId,onActivity,creating,!!active]);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;createController.current?.abort()}},[]);
  useEffect(()=>{
    if(!expanded)return;
    const controller=new AbortController();setAvailable(null);
    fetch('/api/3d/status',{signal:controller.signal}).then(readResponse).then(data=>{if(!controller.signal.aborted)setAvailable(data.available===true)}).catch(()=>{if(!controller.signal.aborted)setAvailable(false)});
    return()=>controller.abort();
  },[expanded,check]);
  useEffect(()=>{
    if(!active||paused)return;
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{
      try{
        const result=await fetch(`/api/3d/jobs/${encodeURIComponent(job.id)}`,{signal:controller.signal}).then(readResponse);
        if(controller.signal.aborted)return;
        if(!['PENDING','IN_PROGRESS','SUCCEEDED','FAILED','CANCELED'].includes(result.status))throw new Error('The 3D service returned an unknown task state. Check Meshy task history.');
        setJob({id:job.id,status:result.status,progress:Math.max(0,Math.min(100,Number(result.progress)||0)),error:result.error});
        if(['PENDING','IN_PROGRESS'].includes(result.status))timer=setTimeout(poll,5000);
      }catch(e){if(!controller.signal.aborted){setError((e as Error).message);setPaused(true)}}
    };
    void poll();return()=>{controller.abort();clearTimeout(timer)};
  },[job?.id,!!active,paused,check]);
  async function create(){
    if(!available||!consent||pending.current||job||otherActive)return;
    pending.current=true;setCreating(true);setError('');
    const controller=new AbortController();createController.current=controller;
    try{
      const result=await fetch('/api/3d/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image,consent:true}),signal:controller.signal}).then(readResponse);
      if(typeof result.id!=='string'||!result.id)throw new Error('No 3D task ID was returned. Check Meshy task history before trying again.');
      if(alive.current)setJob({id:result.id,status:'PENDING',progress:0});
    }catch(e){if(alive.current&&!controller.signal.aborted)setError((e as Error).message)}
    finally{pending.current=false;if(alive.current)setCreating(false)}
  }
  function closeViewer(){setViewer(false);requestAnimationFrame(()=>openButton.current?.focus())}
  return <div className="outfit-model">
    <button className="outfit-model-toggle" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}><Box size={17}/>{expanded?'Hide 3D controls':'Make this look 3D'}<span aria-hidden="true">{expanded?'−':'+'}</span></button>
    {expanded&&<div className="outfit-model-panel">
      <h4>A new perspective.</h4><p>Create a textured 3D model from this outfit photo, then turn it around and zoom in.</p>
      <small>Best with one person standing, head and feet visible, arms away from the body. Hidden surfaces, facial likeness and clothing details will be estimated. This is not a body scan or a size prediction.</small>
      {available===null&&<p role="status">Checking the 3D service…</p>}
      {available===false&&<div className="outfit-model-setup"><b>Connect Meshy to create your model.</b><p>Add a Meshy API key to the server, then restart it. Your existing ZaoAPI photo generation is separate.</p><button onClick={()=>setCheck(n=>n+1)}>Check connection again</button></div>}
      {otherActive&&!job&&<p>Another model is being created. Wait for it to finish before starting this one.</p>}
      {!job&&<><label className="outfit-model-consent"><input type="checkbox" checked={consent} disabled={creating} onChange={e=>setConsent(e.target.checked)}/><span>Send this generated outfit photo to Meshy to create a 3D model. I have permission to use it. Meshy credits and data policies apply.</span></label><button className="primary" disabled={!available||!consent||creating||otherActive} onClick={()=>void create()}>{creating?'SUBMITTING TO MESHY…':'CREATE 3D MODEL'}</button></>}
      {job&&<div className="outfit-model-job" role="status" aria-live="polite">
        {active&&<><b>{paused?'Status check paused':'Building your 3D model…'}</b><progress aria-label="3D model progress" value={job.progress} max={100}/><span>{job.progress}% · This can take several minutes.</span></>}
        {job.status==='SUCCEEDED'&&<><b>Your 3D model is ready.</b><button className="primary" ref={openButton} onClick={()=>setViewer(true)}>VIEW IN 360°</button><a href={`/api/3d/jobs/${encodeURIComponent(job.id)}/model`} download="nexaisle-outfit.glb">Download 3D model ↗</a></>}
        {['FAILED','CANCELED'].includes(job.status)&&<><p role="alert">{job.error||'Meshy could not finish this model. Check its task history for details.'}</p><button className="secondary" onClick={()=>{setJob(null);setConsent(false);setError('')}}>Prepare another conversion</button></>}
        <small>Local reference: {job.id}</small>
      </div>}
      {error&&<p className="outfit-model-error" role="alert">{error}</p>}
      {paused&&<button className="secondary" onClick={()=>{setError('');setPaused(false);setCheck(n=>n+1)}}><RefreshCw size={14}/> Check existing task</button>}
      {(job||creating)&&<small className="outfit-model-warning">Keep this studio open to receive your model. Closing it does not cancel a paid Meshy task. Download the model before closing; this app does not save it permanently.</small>}
    </div>}
    {viewer&&job&&<Suspense fallback={<div className="model-viewer-overlay" role="status">Opening 3D viewer…<button aria-label="Close 3D viewer" onClick={closeViewer}>Close</button></div>}><ModelViewer url={`/api/3d/jobs/${encodeURIComponent(job.id)}/model`} title={title} onClose={closeViewer}/></Suspense>}
  </div>;
}
