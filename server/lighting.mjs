import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const settings={
 living:'an elegant living room with a sofa, armchairs and a low coffee table; install hanging fixtures above the coffee table or seating area',
 kids:'a beautiful children’s bedroom with soft playful colours, a child-sized bed, books and toy storage; no people',
 bedroom:'a calm bedroom with a double bed, layered linen, bedside tables and warm neutral textures',
 kitchen:'a contemporary kitchen with cabinetry, an island, stools and natural stone worktops',
 study:'a refined home study with a desk, reading chair, bookcases and thoughtful work surfaces',
 my:'the customer’s original room',
};
function decodeImage(value){
 if(typeof value!=='string'||value.length>8_000_000)throw Error('Choose a smaller JPG, PNG or WEBP photo.');
 const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
 if(!match)throw Error('Use a valid JPG, PNG or WEBP photo.');
 const bytes=Buffer.from(match[2],'base64');
 if(bytes.length<12)throw Error('The room photo is empty or invalid.');
 return new Blob([bytes],{type:`image/${match[1]}`});
}
export function createLightingHandler({key=process.env.OPENAI_API_KEY,fetcher=fetch,baseUrl=process.env.OPENAI_BASE_URL||'https://api.openai.com/v1',model=process.env.OPENAI_IMAGE_MODEL||'gpt-image-1',outputFormat='png',cacheDir=fileURLToPath(new URL('../.cache/lighting-scenes/',import.meta.url)),readProduct=async id=>{
 const products=JSON.parse(await readFile(new URL('./lighting-products.json',import.meta.url),'utf8'));
 const product=products.find(p=>p.id===id);if(!product)return null;
 return {...product,blob:new Blob([await readFile(new URL('../public'+product.image,import.meta.url))],{type:'image/jpeg'})};
}}={}){
 const base=baseUrl.replace(/\/+$/,'');
 if(!['https://api.openai.com/v1','https://api.miaoquai.com/v1'].includes(base))throw Error('OPENAI_BASE_URL must be the OpenAI or ZaoAPI HTTPS /v1 address.');
 const inFlight=new Map();
 let queue=Promise.resolve();
 let active=false,lastStarted=0;
 return async(req,res)=>{
  if(req.url!=='/api/lighting/render'||req.method!=='POST')return false;
  res.setHeader('Cache-Control','no-store');
  let settle,pendingKey=null,privatePhoto=false;
  const send=(status,value)=>{settle?.({status,value});if(!res.destroyed){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));}};
  try{if(req.headers.origin){const origin=new URL(req.headers.origin);const local=origin.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(origin.hostname)&&Number(origin.port)>=5173&&Number(origin.port)<=5199;const same=['http:','https:'].includes(origin.protocol)&&origin.host===req.headers.host;if(!local&&!same){send(403,{error:'Origin not allowed.'});return true;}}}catch{send(403,{error:'Origin not allowed.'});return true;}
  if(!key){send(503,{error:'AI room generation is not connected. Configure the existing image server API key, then restart npm run server.'});return true;}
  let acquired=false,releaseTurn;const controller=new AbortController();let timer=setTimeout(()=>controller.abort(),180_000);
  res.on('close',()=>{if(privatePhoto&&!res.writableEnded)controller.abort()});
  try{
   let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>9_000_000){send(413,{error:'Photo is too large. Choose a smaller photograph.'});return true;}}
   let input;try{input=JSON.parse(body)}catch{send(400,{error:'Invalid request.'});return true;}
   if(!input||typeof input!=='object'||!Object.hasOwn(settings,input.room)||typeof input.productId!=='string'||!/^[a-z]+$/.test(input.productId)||input.consent!==true){send(400,{error:'Choose a known room and product, and agree to photo generation.'});return true;}
   privatePhoto=input.room==='my';
   let photo;if(input.room==='my'){try{photo=decodeImage(input.photo)}catch(e){send(400,{error:e.message});return true;}}
   const position=input.position;if(position&&(!Number.isFinite(position.x)||!Number.isFinite(position.y)||position.x<0||position.x>100||position.y<0||position.y>100)){send(400,{error:'Choose a placement point inside the room photograph.'});return true;}
   const product=await readProduct(input.productId);if(!product){send(400,{error:'Unknown IKEA product.'});return true;}
   // Only catalogue scenes are persisted. Customer room photographs never enter this cache.
   const cacheId=!photo&&cacheDir?createHash('sha256').update(JSON.stringify({version:3,model,base,outputFormat,room:input.room,product:product.name,quality:'medium'})).update(Buffer.from(await product.blob.arrayBuffer())).digest('hex'):null;
   const cacheFile=cacheId?join(cacheDir,cacheId+'.json'):null;
   if(cacheFile&&input.regenerate!==true){try{const cached=JSON.parse(await readFile(cacheFile,'utf8'));if(typeof cached.image==='string'&&/^data:image\/(png|jpeg);base64,/.test(cached.image)){send(200,{...cached,cached:true});return true;}}catch{/* A missing or corrupt cache entry is generated normally. */}}
   if(cacheId&&inFlight.has(cacheId)&&input.regenerate!==true){const shared=await inFlight.get(cacheId);send(shared.status,shared.value);return true;}
   if(cacheId){pendingKey=cacheId;inFlight.set(cacheId,new Promise(resolve=>{settle=resolve}));}
   // Queue distinct rooms instead of rejecting navigation with a busy error.
   const previous=queue;queue=new Promise(resolve=>{releaseTurn=resolve});
   await previous;
   clearTimeout(timer);timer=setTimeout(()=>controller.abort(),180_000);
   active=true;acquired=true;
   const cooldown=Math.max(0,3000-(Date.now()-lastStarted));
   if(cooldown)await new Promise(resolve=>setTimeout(resolve,cooldown));
   const installation=product.category==='Table lamps'?'Place the complete table/work lamp on a real supporting desk, bedside table or sideboard. Its base must sit on the surface. Never hang it from the ceiling.':product.category==='Bulbs'?'Install ONE reference bulb inside an appropriate real socket/fixture; do not leave bulbs floating, duplicate the product packaging, or invent a standalone chandelier.':'Suspend the fixture from an appropriate ceiling mount with realistic cable or chain, architectural perspective and believable clearance.';
   const scene=photo?'Image 1 is the customer room. Preserve its exact architecture, perspective, framing, walls, colours, furniture and layout. Edit only the required installation area and physically necessary shadows. Do not redesign, remove unrelated objects, crop or add furniture. Image 2 is the IKEA product reference.':`Create one photorealistic interior photograph of ${settings[input.room]}. The input image is the IKEA product reference, not a room. Every scenario must have a distinctly appropriate layout, furniture and colour palette.`;
   const prompt=`${scene} Install the exact ${product.name}, ${product.subtitle}, ${product.material}, from the product reference. Preserve its silhouette, number of arms/shades, proportions, colour, material, glass prisms and construction. Do not substitute or invent another lamp. ${installation} Analyse ceiling, walls, furniture planes and camera perspective before placing it; match realistic human-scale dimensions, occlusion, contact shadows, metallic/glass reflections and natural indirect light. ${position?`The customer suggests the centre of the fixture near x=${position.x}%, y=${position.y}% of the original photograph; use the closest physically valid installation point.`:photo?'Choose the most physically plausible installation location.':'Compose the fixture near the upper centre of the image (around 50% across and 35% down); for a table lamp place it near the centre on a supporting surface.'} Render bright natural daytime sunlight and realistic window shadows with the lamp switched OFF, no artificial bloom. Preserve natural room illumination for the website’s interactive lighting overlay. No text, logos, watermark, collage, before-after panels, people, packaging or multiple versions. One coherent image. Product identity takes priority over decorative styling.`;
   const form=new FormData();form.set('model',model);if(outputFormat==='jpeg'){form.set('output_format','jpeg');form.set('output_compression','85')}form.set('size',photo?'auto':'1024x1024');form.set('quality',photo?'high':'medium');if(!/^gpt-image-2/.test(model))form.set('input_fidelity','high');form.set('n','1');
   if(photo)form.append('image[]',photo,'room.jpg');form.append('image[]',product.blob,'ikea-product.jpg');form.set('prompt',prompt);lastStarted=Date.now();
   const response=await fetcher(base+'/images/edits',{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${key}`},body:form,signal:controller.signal});
   if(!response.ok){send(502,{error:response.status===429?'The image provider is busy or its quota is exhausted. Try later.':`The image provider returned HTTP ${response.status}. Check that the configured model supports image editing with reference photos.`});return true;}
   const data=await response.json();if(typeof data.data?.[0]?.b64_json!=='string'||!data.data[0].b64_json)throw Error('No image returned');
   const output={image:`data:image/${outputFormat};base64,${data.data[0].b64_json}`,approximate:true};
   if(cacheFile){try{await mkdir(cacheDir,{recursive:true,mode:0o700});const temp=cacheFile+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(output),{mode:0o600});await rename(temp,cacheFile);}catch{/* A disk-cache failure must not discard a successful image. */}}
   send(200,output);
  }catch{send(502,{error:controller.signal.aborted?'Generation timed out or was cancelled. Please try again.':'Room generation failed. Please try again.'});}
  finally{clearTimeout(timer);if(acquired){active=false;if(pendingKey)inFlight.delete(pendingKey);releaseTurn?.();}}
  return true;
 };
}
