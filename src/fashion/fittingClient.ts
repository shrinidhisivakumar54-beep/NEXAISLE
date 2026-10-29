import {createFittingCoordinator,type FittingJob,FITTING_VERSION} from './fittingCoordinator';
import {atlasUrl,findPiece} from './collection';
type Session={id:string;revision:number};
let session:Promise<Session>|null=null,sessionRevision=-1,sessionEpoch=0;
const garmentCache=new Map<string,Promise<string>>();
async function read(response:Response){let data;try{data=await response.json()}catch{throw Error(`The fitting server returned no readable response (HTTP ${response.status}). Restart the local backend if it was updated.`)}if(!response.ok){const error=Object.assign(new Error(data?.error||`Fitting failed (HTTP ${response.status}).`),{code:data?.code,status:response.status});throw error}return data}
export function garmentImage(id:string){if(!garmentCache.has(id))garmentCache.set(id,(async()=>{const piece=findPiece(id);if(!piece)throw Error('No product photograph is available for this garment.');const img=new Image();img.src=atlasUrl;await img.decode();const [l,t,r,b]=piece.crop,c=document.createElement('canvas');c.width=r-l;c.height=b-t;c.getContext('2d')!.drawImage(img,l,t,r-l,b-t,0,0,c.width,c.height);return c.toDataURL('image/png')})().catch(error=>{garmentCache.delete(id);throw error}));return garmentCache.get(id)!}
function deleteSession(id:string){void fetch('/api/try-on/session',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:id}),keepalive:true}).catch(()=>{})}
export function clearFittingSession(){sessionEpoch++;const previous=session;session=null;sessionRevision=-1;if(previous)void previous.then(s=>deleteSession(s.id)).catch(()=>{})}
async function photoSession(job:FittingJob){if(session&&sessionRevision===job.revision)return session;if(session)clearFittingSession();const epoch=sessionEpoch;sessionRevision=job.revision;const pending=fetch('/api/try-on/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({person:job.photo,consent:true})}).then(read).then(data=>{if(typeof data.sessionId!=='string')throw Error('The backend needs the photo-session update. Restart npm run server.');if(epoch!==sessionEpoch){deleteSession(data.sessionId);throw Object.assign(Error('Photo changed.'),{name:'AbortError'})}return {id:data.sessionId,revision:job.revision}}).catch(error=>{if(session===pending){session=null;sessionRevision=-1}throw error});session=pending;return pending}
async function generate(job:FittingJob,signal:AbortSignal){const garment=await garmentImage(job.garmentId);if(signal.aborted)throw Object.assign(Error('Photo changed.'),{name:'AbortError'});let reference=await photoSession(job);if(signal.aborted)throw Object.assign(Error('Photo changed.'),{name:'AbortError'});
 const submit=()=>fetch('/api/try-on',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:reference.id,garment,garmentName:job.garmentName,pose:job.pose,workflow:FITTING_VERSION,expectedProvider:job.provider,expectedModel:job.model,consent:true}),signal}).then(read);
 const started=performance.now();let result;try{result=await submit()}catch(error){if((error as {code?:string}).code!=='SESSION_EXPIRED')throw error;clearFittingSession();reference=await photoSession(job);if(signal.aborted)throw Object.assign(Error('Photo changed.'),{name:'AbortError'});result=await submit()}
 if(typeof result.image!=='string'||!(result.image.startsWith('data:image/png;base64,')||result.image.startsWith('https://')))throw Error('The provider returned no supported image.');return {image:result.image as string,durationMs:performance.now()-started}
}
export const fitting=createFittingCoordinator(generate);
// Preload only completed images. This never asks the provider to make unselected outfits.
const decoded=new Map<string,Promise<void>>();
export function decodeFittingImage(src:string){if(!decoded.has(src)){const img=new Image();img.src=src;decoded.set(src,img.decode().catch(()=>{decoded.delete(src);throw Error('The completed image could not load. Its link may have expired; no new generation was started.')}));while(decoded.size>20)decoded.delete(decoded.keys().next().value!)}return decoded.get(src)!}
export function clearDecodedFits(){decoded.clear()}

if(typeof window!=='undefined')window.addEventListener('pagehide',()=>{fitting.clear();clearFittingSession();clearDecodedFits()});
