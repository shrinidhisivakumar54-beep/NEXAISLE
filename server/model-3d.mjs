import {randomUUID} from 'node:crypto';

// Meshy image-to-3D contract. Live conversion needs a Meshy API account and has
// not been verified with a paid request in this development environment.
const endpoint='https://api.meshy.ai/openapi/v1/image-to-3d';
const MAX_BODY=8*1024*1024, MAX_MODEL=50*1024*1024;
const terminal=new Set(['SUCCEEDED','FAILED','CANCELED']);
const statuses=new Set(['PENDING','IN_PROGRESS',...terminal]);
class RequestError extends Error {constructor(status,message){super(message);this.status=status;}}
function allowedOrigin(req){
  if(!req.headers.origin)return true;
  try {
    const origin=new URL(req.headers.origin);
    return (['http:','https:'].includes(origin.protocol)&&origin.host===req.headers.host) ||
      (origin.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(origin.hostname)&&Number(origin.port)>=5173&&Number(origin.port)<=5199);
  } catch {return false;}
}
async function readJson(req){
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new RequestError(415,'Send a JSON request.');
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>MAX_BODY)throw new RequestError(413,'Choose a smaller reference image (under 8 MB).');chunks.push(chunk);}
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new RequestError(400,'Invalid JSON request.');}
}
function validateImage(value){
  if(typeof value!=='string'||value.length>MAX_BODY)throw new RequestError(400,'Choose a reference image smaller than 8 MB.');
  const match=/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if(!match||match[2].length%4!==0)throw new RequestError(400,'Use a PNG or JPEG reference image.');
  const bytes=Buffer.from(match[2],'base64');
  const valid=match[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(!valid)throw new RequestError(400,'The reference image could not be read.');
}
function assetUrl(value){
  try {const url=new URL(value);if(url.protocol==='https:'&&url.hostname==='assets.meshy.ai'&&!url.username&&!url.password&&(!url.port||url.port==='443'))return url.href;}catch{}
  throw new RequestError(502,'Meshy returned an unsupported model download address. Check the provider task before retrying.');
}
async function limitedBytes(response,limit){
  if(Number(response.headers.get('content-length'))>limit)throw new RequestError(502,'The 3D model is too large for this viewer (maximum 50 MB).');
  if(!response.body)throw new RequestError(502,'Meshy returned an empty response.');
  const reader=response.body.getReader();let size=0;const parts=[];
  try {while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw new RequestError(502,'The provider response is too large for this viewer.');parts.push(Buffer.from(value));}}
  catch(error){await reader.cancel().catch(()=>{});throw error;}
  finally {reader.releaseLock();}
  return Buffer.concat(parts);
}
async function providerJson(response){
  if(!response.ok)throw new RequestError(502,`Meshy returned HTTP ${response.status}. Check your Meshy key, credits, and task history before retrying.`);
  try {return JSON.parse((await limitedBytes(response,1024*1024)).toString('utf8'));}
  catch(error){if(error instanceof RequestError)throw error;throw new RequestError(502,'Meshy returned an unreadable response. Check its task history before retrying.');}
}

export function createModelHandler({key=process.env.MESHY_API_KEY,fetcher=fetch,now=Date.now,pollIntervalMs=3000}={}){
  const jobs=new Map();let creating=false;
  const refresh=async(job,signal)=>{
    if(terminal.has(job.status)||now()-job.checkedAt<pollIntervalMs)return;
    if(job.refreshPromise)return job.refreshPromise;
    job.refreshPromise=(async()=>{
      const response=await fetcher(`${endpoint}/${encodeURIComponent(job.providerId)}`,{headers:{Authorization:`Bearer ${key}`},redirect:'error',signal});
      const data=await providerJson(response);
      if(!statuses.has(data?.status))throw new RequestError(502,'Meshy returned an unknown task status. Check the provider task history.');
      job.status=data.status;job.progress=Number.isFinite(data.progress)?Math.max(0,Math.min(100,data.progress)):0;job.checkedAt=now();
      if(data.status==='SUCCEEDED'){
        try {job.modelUrl=assetUrl(data.model_urls?.glb);job.progress=100;}
        catch(error){job.status='FAILED';job.error=error.message;}
      }
      if(data.status==='FAILED'||data.status==='CANCELED')job.error='Meshy could not complete this reconstruction. Check the task in your Meshy account before starting another conversion.';
    })();
    try {await job.refreshPromise;}finally{job.refreshPromise=null;}
  };
  return async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    const send=(status,data)=>{if(!res.destroyed&&!res.writableEnded){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));}};
    if(req.url==='/api/3d/status'&&req.method==='GET')return send(200,{available:!!key,provider:'Meshy'});
    if(!allowedOrigin(req))return send(403,{error:'Origin not allowed. Open the Local URL printed by npm run dev.'});
    if(!key)return send(503,{error:'3D conversion is not connected. Add MESHY_API_KEY to the server .env file and restart npm run server.'});
    const route=/^\/api\/3d\/jobs\/([a-f0-9-]{36})(\/model)?$/.exec(req.url||'');
    const isCreate=req.url==='/api/3d/jobs'&&req.method==='POST';
    if(!isCreate&&(!route||req.method!=='GET'))return send(404,{error:'3D route not found.'});
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90_000);
    const disconnect=()=>{if(!res.writableEnded)controller.abort();};res.on('close',disconnect);
    try {
      // Keep only recent completed job metadata; no images or keys are stored.
      for(const [id,job] of jobs){if(terminal.has(job.status)&&now()-job.createdAt>24*60*60*1000)jobs.delete(id);}
      if(isCreate){
        if(creating)throw new RequestError(429,'A 3D conversion is already being started. Please wait.');
        creating=true;
        try {
          const input=await readJson(req);
          if(input?.consent!==true)throw new RequestError(400,'Agree to send this outfit image to Meshy before creating the model.');
          validateImage(input.image);
          for(const job of jobs.values()){
            if(!terminal.has(job.status)){await refresh(job,controller.signal);if(!terminal.has(job.status))throw new RequestError(429,'A 3D conversion is still running. Reopen its viewer or wait for it to finish before creating another.');}
          }
          if(jobs.size>=32){const oldest=[...jobs].find(([,job])=>terminal.has(job.status));if(oldest)jobs.delete(oldest[0]);}
          const response=await fetcher(endpoint,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},redirect:'error',signal:controller.signal,body:JSON.stringify({image_url:input.image,should_texture:true,enable_pbr:true})});
          const data=await providerJson(response);
          if(typeof data?.result!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(data.result))throw new RequestError(502,'Meshy did not return a valid task ID. Check its task history before retrying.');
          const id=randomUUID();jobs.set(id,{providerId:data.result,status:'PENDING',progress:0,createdAt:now(),checkedAt:-Infinity});
          return send(202,{id});
        } finally {creating=false;}
      }
      const job=jobs.get(route[1]);
      if(!job)throw new RequestError(404,'This 3D task is no longer available on this server. Check your Meshy task history; restarting the server clears local task references.');
      await refresh(job,controller.signal);
      if(!route[2])return send(200,{id:route[1],status:job.status,progress:job.progress,...(job.error?{error:job.error}:{})});
      if(job.status!=='SUCCEEDED'||!job.modelUrl)throw new RequestError(409,'The model is not ready to download yet.');
      const response=await fetcher(assetUrl(job.modelUrl),{redirect:'error',signal:controller.signal});
      if(!response.ok)throw new RequestError(502,`The Meshy model download returned HTTP ${response.status}. Check the completed task in Meshy.`);
      const model=await limitedBytes(response,MAX_MODEL);
      if(model.length<20||model.toString('ascii',0,4)!=='glTF'||model.readUInt32LE(4)!==2||model.readUInt32LE(8)!==model.length)throw new RequestError(502,'The downloaded file is not a supported GLB 2 model.');
      if(!res.destroyed){res.writeHead(200,{'Content-Type':'model/gltf-binary','Content-Length':model.length,'Content-Disposition':'attachment; filename="nexaisle-model.glb"','X-Content-Type-Options':'nosniff'});res.end(model);}
    }catch(error){send(error instanceof RequestError?error.status:502,{error:error instanceof RequestError?error.message:controller.signal.aborted?'The 3D request timed out or was interrupted. The Meshy task may still be running; check its history before retrying.':'Could not complete the Meshy connection. Check your connection and Meshy task history before retrying.'});}
    finally {clearTimeout(timer);res.off('close',disconnect);}
  };
}
