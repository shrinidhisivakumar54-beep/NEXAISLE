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
export function createHandler({key=process.env.OPENAI_API_KEY, fetcher=fetch, baseUrl=process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1', model=process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'}={}) {
  const base=baseUrl.replace(/\/+$/, '');
  if(!['https://api.openai.com/v1','https://api.miaoquai.com/v1'].includes(base)) throw new Error('OPENAI_BASE_URL must be the OpenAI or ZaoAPI HTTPS /v1 address.');
  const provider=base.includes('miaoquai.com')?'ZaoAPI':'OpenAI';
  let active=false;
  let lastStarted=0;
  return async (req,res) => {
    res.setHeader('Cache-Control','no-store');
    const send=(status,data)=>{if(!res.destroyed){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));}};
    if(req.url==='/api/try-on/status' && req.method==='GET') return send(200,{available:!!key,provider,model});
    if(req.url!=='/api/try-on' || req.method!=='POST') return send(404,{error:'Not found'});
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
    if(active || Date.now()-lastStarted<3000) return send(429,{error:'Please wait for the current generation before trying again.'});
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
      let person, garment;
      try {person=image(input.person);garment=image(input.garment);} catch(error) {return send(400,{error:error.message});}
      const form=new FormData();
      form.set('model',model);form.set('size','1024x1536');form.set('quality','high');form.set('input_fidelity','high');form.set('n','1');
      form.append('image[]',person,'person.png');form.append('image[]',garment,'garment.png');
      form.set('prompt',`Create a photorealistic full-body fashion try-on photograph. Image 1 is the person: preserve their identity, face, skin tone, body proportions, age and hair. Image 2 is the garment reference: dress the person in this exact garment, preserving its colour, graphic, neckline, sleeves, texture and silhouette. Replace only the corresponding clothing; retain complementary clothing and shoes. No hangers. Fit naturally to the body with realistic folds, lighting, shadows and correct arm/hair occlusion. Pose: ${poses[input.pose]}. Keep the whole person including head and feet in frame in a softly lit ivory studio. One person, one image, no collage, no text. Do not change their body shape or beautify their face. This is an illustrative styling image.`);
      lastStarted=Date.now();
      const response=await fetcher(base+'/images/edits',{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${key}`},body:form,signal:controller.signal});
      if(!response.ok) return send(502,{error:response.status===429?'The image service is busy or its quota is exhausted. Try later.':`${provider} image editing returned HTTP ${response.status}. Check that this key and model support /v1/images/edits with two images.`});
      let result;
      try { result=await response.json(); }
      catch {return send(502,{error:`${provider} returned an empty or invalid image response (HTTP ${response.status}). Check provider request history before retrying.`});}
      if(!result?.data?.[0]?.b64_json) return send(502,{error:`${provider} returned no base64 image. Its response format may differ from the supported image-editing API. Check provider request history before retrying.`});
      send(200,{image:`data:image/png;base64,${result.data[0].b64_json}`});
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
