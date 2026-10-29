import {randomUUID} from 'node:crypto';
import {createModelHandler} from './model-3d.mjs';
import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';

export const poses = {front:'standing facing the camera, arms relaxed slightly away from torso', turn:'a natural three-quarter turn toward the camera', walk:'a relaxed walking pose, full body visible'};
// Only known codes are exposed: exception text can contain URLs or secrets.
const connectionCodes=new Set(['UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT','UND_ERR_SOCKET','ECONNRESET','ECONNREFUSED','ETIMEDOUT','ENOTFOUND','EAI_AGAIN','ERR_INVALID_CHAR','ERR_INVALID_ARG_TYPE']);
function image(value) {
  if(typeof value !== 'string' || value.length > 8_000_000) throw new Error('Choose a smaller photo.');
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if(!match) throw new Error('Use a JPG, PNG or WebP image.');
  return new Blob([Buffer.from(match[2], 'base64')], {type:`image/${match[1]}`});
}
export function createHandler({key=process.env.OPENAI_API_KEY, fetcher=fetch, baseUrl=process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1', model=process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',now=Date.now,sessionTTL=30*60_000,rateLimitMs=3000}={}) {
  const base=baseUrl.replace(/\/+$/, '');
  if(!['https://api.openai.com/v1','https://api.miaoquai.com/v1'].includes(base)) throw new Error('OPENAI_BASE_URL must be the OpenAI or ZaoAPI HTTPS /v1 address.');
  const provider=base.includes('miaoquai.com')?'ZaoAPI':'OpenAI';
  const photoSessions=new Map();
  const dropSession=id=>{const session=photoSessions.get(id);if(session)clearTimeout(session.timer);photoSessions.delete(id)};
  const scheduleExpiry=(id,session)=>{clearTimeout(session.timer);session.timer=setTimeout(()=>photoSessions.delete(id),sessionTTL);session.timer.unref?.()};
  const expireSessions=()=>{for(const [id,session] of photoSessions)if(session.expires<=now())dropSession(id)};
  let active=false;
  let lastStarted=0;
  return async (req,res) => {
    res.setHeader('Cache-Control','no-store');
    const send=(status,data)=>{if(!res.destroyed){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));}};
    if(req.url==='/api/try-on/status' && req.method==='GET') return send(200,{available:!!key,provider,model,photoSessions:true,pipeline:'image-editing',active});
    const sessionRoute=req.url==='/api/try-on/session'&&['POST','DELETE'].includes(req.method);
    if(!sessionRoute&&(req.url!=='/api/try-on'||req.method!=='POST'))return send(404,{error:'Not found'});
    // Vite may forward its browser Origin while using the API's Host header.
    // Allow local development ports only, never arbitrary forwarded origins.
    try {if(req.headers.origin) {
      const origin=new URL(req.headers.origin);
      const localDev=origin.protocol==='http:' && ['localhost','127.0.0.1','[::1]'].includes(origin.hostname) && Number(origin.port)>=5173 && Number(origin.port)<=5199;
      const sameOrigin=['http:','https:'].includes(origin.protocol) && origin.host===req.headers.host;
      if(!localDev&&!sameOrigin) return send(403,{error:'Origin not allowed. Open the website using the Local URL printed by npm run dev (ports 5173–5199).'});
    }}
    catch {return send(403,{error:'Origin not allowed.'});}
    if(!key) return send(503,{error:'AI generation is not connected yet. The site owner needs to configure the server API key.'});
    if(sessionRoute){
      try{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>8_100_000)return send(413,{error:'Choose a smaller photo.'})}let input;try{input=JSON.parse(raw)}catch{return send(400,{error:'Invalid photo session request.'})}expireSessions();
        if(req.method==='DELETE'){if(typeof input?.sessionId!=='string')return send(400,{error:'Invalid photo session.'});dropSession(input.sessionId);return send(200,{deleted:true})}
        if(input?.consent!==true)return send(400,{error:'Agree to send this photo for AI fitting first.'});try{image(input.person)}catch(error){return send(400,{error:error.message})}if(photoSessions.size>=4)return send(429,{error:'Too many active photo sessions. Delete an unused photo or wait for it to expire.'});const id=randomUUID();const session={person:input.person,expires:now()+sessionTTL,timer:null};photoSessions.set(id,session);scheduleExpiry(id,session);return send(201,{sessionId:id,expiresInSeconds:sessionTTL/1000});
      }catch{return send(400,{error:'The local photo session could not be created.'})}
    }
    if(active || Date.now()-lastStarted<rateLimitMs) return send(429,{error:'Please wait for the current generation before trying again.'});
    active=true;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),180_000);
    res.on('close',()=>{if(!res.writableEnded)controller.abort();});
    try {
      let body='';
      for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>17_000_000) {send(413,{error:'Photo is too large.'});return;}}
      let input;
      try { input=JSON.parse(body); } catch {return send(400,{error:'Invalid request.'});}
      if(!Object.hasOwn(poses,input.pose) || input.consent!==true) return send(400,{error:'Choose a pose and agree to send your photo for generation.'});
      if(input.expectedProvider!==undefined&&input.expectedProvider!==provider||input.expectedModel!==undefined&&input.expectedModel!==model)return send(409,{code:'CONFIGURATION_CHANGED',error:'The fitting service configuration changed. Reload the fitting room before generating.'});
      if(input.workflow!==undefined&&input.workflow!=='photo-fit-v3')return send(400,{error:'Unsupported fitting workflow.'});
      let reference=input.person;if(input.sessionId!==undefined){if(input.person!==undefined||typeof input.sessionId!=='string')return send(400,{error:'Choose one photo reference.'});expireSessions();const session=photoSessions.get(input.sessionId);if(!session)return send(410,{code:'SESSION_EXPIRED',error:'Your local photo session expired. Reconnect the saved photo before fitting.'});session.expires=now()+sessionTTL;scheduleExpiry(input.sessionId,session);reference=session.person}
      let person, garment;
      try {person=image(reference);garment=image(input.garment);} catch(error) {return send(400,{error:error.message});}
      const form=new FormData();
      form.set('model',model);form.set('size','1024x1536');form.set('quality','high');form.set('input_fidelity','high');form.set('n','1');
      form.append('image[]',person,'person.png');form.append('image[]',garment,'garment.png');
      form.set('prompt',`Create a photorealistic full-body fashion try-on photograph. Image 1 is the person: preserve their identity, face, skin tone, body proportions, age and hair. Image 2 is the garment reference: dress the person in this exact garment, preserving its colour, graphic, neckline, sleeves, texture and silhouette. Replace only the corresponding clothing; retain complementary clothing and shoes. No hangers. Fit naturally to the body with realistic folds, lighting, shadows and correct arm/hair occlusion. Pose: ${poses[input.pose]}. Keep the whole person including head and feet in frame in a softly lit ivory studio. One person, one image, no collage, no text. Do not change their body shape or beautify their face. This is an illustrative styling image.`);
      if(input.carousel===true)form.set('prompt',`Create ONE photorealistic fashion showroom photograph. Image 1 is the sole main person reference. Ignore all bystanders and remove the entire original background. Preserve the main person's identity, age, face, hair, skin tone and body proportions as faithfully as possible. Image 2 is the exact selected garment. Replace the corresponding existing clothing completely with this garment, preserving its colour, material, graphic, neckline, sleeves and silhouette. It must be naturally WORN, not pasted on: correct shoulder seams, neckline around the base of the neck, realistic arm/hair occlusion, folds, perspective and body contour. No hanger. One person only, standing upright, looking toward the camera, arms relaxed slightly away from the torso, complete head-to-toe body centred and fully visible, neutral complementary trousers/skirt and shoes if not supplied. If Image 1 is already a full-body studio photo, preserve its exact pose, face, camera and framing. If the body is cropped, infer a plausible clothed full body without claiming measured proportions. Use the exact same straight-on camera, softly lit charcoal studio background RGB 16,17,23, and neutral studio lighting for every garment. Person occupies 86 percent of image height. No scenery, other people, text, hangers, collage or accessories not in the reference. This is an illustrative AI styling image, not a physical fitting.`);
      if(input.workflow==='photo-fit-v3')form.set('prompt',`Edit Image 1 into ONE photorealistic fashion fitting photograph. Image 1 is the sole identity and body reference; Image 2 is the exact garment reference. ${typeof input.garmentName==='string'?'Selected catalogue item: '+input.garmentName.slice(0,120)+'. ':''}Preserve the main person's actual face, facial features, age, skin tone, hairstyle, body shape and natural proportions. Ignore and remove all bystanders. Do not paste, copy or crop a rectangular face patch. Replace the corresponding original clothing COMPLETELY, including old sleeves, collars and visible fragments around the shoulders, with the garment from Image 2. Render it naturally worn: correct neckline, shoulder seams, sleeve lengths, waist and hem; accurate texture, print, fabric folds, shadows and lighting. Handle hair overlapping the garment and hands or folded arms in front of it with natural occlusion. No floating garment or white old sleeves around the new garment. Do not layer an unchanged original shirt over the result. For a top or jacket keep compatible lower clothing; for a dress replace upper and lower garments covered by the dress. Do not invent body parts that are outside the original photo: if the reference is cropped, preserve its visible body extent and framing. ${input.pose==='front'?'Keep the exact original pose, face direction, camera angle and body scale.':`Requested pose: ${poses[input.pose]}. Keep the same identity and visible body extent.`}Use a consistent softly lit charcoal fashion-studio background RGB 16,17,23, neutral colour rendering and a centred portrait composition. Show only one person and no hangers, labels, collage or image seams. Produce a cohesive complete edited photograph, not a composited clothing sticker. This is an illustrative AI styling image, not a measurement or fit guarantee.`);
      lastStarted=Date.now();
      const response=await fetcher(base+'/images/edits',{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${key}`},body:form,signal:controller.signal});
      if(!response.ok) return send(502,{error:response.status===429?'The image service is busy or its quota is exhausted. Try later.':`${provider} image editing returned HTTP ${response.status}. Check that this key and model support /v1/images/edits with two images.`});
      let result;
      try {result=await response.json()} catch {return send(502,{error:`${provider} returned a response that was not readable JSON. Check the provider request history before retrying; generation may already have been billed.`})}
      const item=result?.data?.[0];
      if(item?.b64_json) return send(200,{image:`data:image/png;base64,${item.b64_json}`});
      if(typeof item?.url==='string') {
        try {const u=new URL(item.url);const h=u.hostname.toLowerCase();
          if(u.protocol==='https:'&&!u.username&&!u.password&&/^[a-z0-9.-]+$/.test(h)&&h.includes('.')&&!/^\d+\./.test(h)&&!h.endsWith('.localhost')&&!h.endsWith('.local')&&!h.endsWith('.internal'))return send(200,{image:u.href});
        } catch {}
        return send(502,{error:`${provider} returned an image address that could not be displayed safely. Check the completed image in your provider account before trying again.`});
      }
      console.error('[try-on] Image missing from provider response; fields:',Object.keys(result||{}).filter(k=>/^[a-zA-Z_]+$/.test(k)).slice(0,12).join(','));
      return send(502,{error:`${provider} did not return an image in the expected format. Check its request history for a completed image or pending task before retrying; another attempt may incur another charge.`});
    } catch(error) {
      const code=error?.cause?.code||error?.code;
      const certificate=['UNABLE_TO_GET_ISSUER_CERT_LOCALLY','UNABLE_TO_VERIFY_LEAF_SIGNATURE','CERT_HAS_EXPIRED','SELF_SIGNED_CERT_IN_CHAIN'].includes(code);
      const diagnostic=controller.signal.aborted?'REQUEST_INTERRUPTED':certificate?'CERTIFICATE_VERIFY_FAILED':connectionCodes.has(code)?code:error?.cause?.message==='unexpected redirect'?'REDIRECT_REJECTED':'CONNECTION_FAILED';
      const detail=controller.signal.aborted?'Generation timed out or was cancelled.':certificate?'The server could not verify the image provider’s HTTPS certificate. Update Node.js or configure its trusted CA certificates; do not disable certificate verification.':`Could not complete the image-editing connection to ${provider}.`;
      send(502,{code:diagnostic,error:`${detail} [${diagnostic}] Check provider request history before retrying. Share this error code for troubleshooting; do not share your API key.`});
    }
    finally {clearTimeout(timer);active=false;}
  };
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const photos=createHandler(), models=createModelHandler();
  createServer((req,res)=>req.url?.startsWith('/api/3d/')?models(req,res):photos(req,res)).listen(8787,'127.0.0.1',()=>console.log('Try-on API listening on http://127.0.0.1:8787'));
}
