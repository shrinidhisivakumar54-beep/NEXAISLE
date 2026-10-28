import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';

export const poses = {front:'standing facing the camera, arms relaxed slightly away from torso', turn:'a natural three-quarter turn toward the camera', walk:'a relaxed walking pose, full body visible'};
function image(value) {
  if(typeof value !== 'string' || value.length > 8_000_000) throw new Error('Choose a smaller photo.');
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if(!match) throw new Error('Use a JPG, PNG or WebP image.');
  return new Blob([Buffer.from(match[2], 'base64')], {type:`image/${match[1]}`});
}
export function createHandler({key=process.env.OPENAI_API_KEY, fetcher=fetch}={}) {
  let active=false;
  let lastStarted=0;
  return async (req,res) => {
    res.setHeader('Cache-Control','no-store');
    const send=(status,data)=>{if(!res.destroyed){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));}};
    if(req.url==='/api/try-on/status' && req.method==='GET') return send(200,{available:!!key});
    if(req.url!=='/api/try-on' || req.method!=='POST') return send(404,{error:'Not found'});
    // This development service is loopback-only. Reject cross-origin browser calls.
    try {if(req.headers.origin && new URL(req.headers.origin).host!==req.headers.host) return send(403,{error:'Origin not allowed.'});}
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
      form.set('model','gpt-image-1');form.set('size','1024x1536');form.set('quality','high');form.set('input_fidelity','high');form.set('n','1');
      form.append('image[]',person,'person.png');form.append('image[]',garment,'garment.png');
      form.set('prompt',`Create a photorealistic full-body fashion try-on photograph. Image 1 is the person: preserve their identity, face, skin tone, body proportions, age and hair. Image 2 is the garment reference: dress the person in this exact garment, preserving its colour, graphic, neckline, sleeves, texture and silhouette. Replace only the corresponding clothing; retain complementary clothing and shoes. No hangers. Fit naturally to the body with realistic folds, lighting, shadows and correct arm/hair occlusion. Pose: ${poses[input.pose]}. Keep the whole person including head and feet in frame in a softly lit ivory studio. One person, one image, no collage, no text. Do not change their body shape or beautify their face. This is an illustrative styling image.`);
      lastStarted=Date.now();
      const response=await fetcher('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:`Bearer ${key}`},body:form,signal:controller.signal});
      if(!response.ok) return send(502,{error:response.status===429?'The image service is busy or its quota is exhausted. Try later.':'The image service could not generate this look. Check the server account or try another photo.'});
      const result=await response.json();
      if(!result.data?.[0]?.b64_json) throw new Error('No image returned');
      send(200,{image:`data:image/png;base64,${result.data[0].b64_json}`});
    } catch {send(502,{error:controller.signal.aborted?'Generation timed out or was cancelled. Please try again.':'Generation failed. Please try again.'});}
    finally {clearTimeout(timer);active=false;}
  };
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  createServer(createHandler()).listen(8787,'127.0.0.1',()=>console.log('Try-on API listening on http://127.0.0.1:8787'));
}
