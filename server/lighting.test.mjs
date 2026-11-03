import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHandler} from './try-on.mjs';
import {createLightingHandler} from './lighting.mjs';
const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
async function service(t,options={},integrated=false){
 const handler=integrated?createHandler({lightingCacheDir:null,...options}):createLightingHandler({cacheDir:null,readProduct:async id=>id==='crystal'?{name:'KRISTALLER',subtitle:'Crystal chandelier · three arms',material:'Glass prisms · silver-coloured steel',category:'Chandeliers',blob:new Blob(['product bytes'],{type:'image/jpeg'})}:null,...options});
 const server=createServer(async(req,res)=>{try{const handled=await handler(req,res);if(handled===false){res.writeHead(404);res.end()}}catch{res.writeHead(500);res.end()}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 return (data,headers={},signal)=>fetch(`http://127.0.0.1:${server.address().port}/api/lighting/render`,{method:'POST',signal,headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
}
test('room endpoint is integrated and reports unavailable credentials',async t=>{const post=await service(t,{key:''},true);const res=await post({});assert.equal(res.status,503);assert.match((await res.json()).error,/not connected/)});
test('rejects missing consent, invalid room, product traversal, invalid photo, placement and foreign origin before provider call',async t=>{
 const post=await service(t,{key:'test',fetcher:()=>{throw Error('Must not call provider')}});
 for(const data of [{productId:'crystal',room:'living',consent:false},{productId:'crystal',room:'garage',consent:true},{productId:'../secret',room:'living',consent:true},{productId:'unknown',room:'living',consent:true},{productId:'crystal',room:'my',consent:true,photo:'https://private.example'},{productId:'crystal',room:'my',consent:true,photo:pixel,position:{x:101,y:20}},null])assert.equal((await post(data)).status,400);
 assert.equal((await post({}, {Origin:'https://untrusted.example'})).status,403);
});
test('all five scenario prompts are distinct and use the real selected product reference',async t=>{
 const prompts=[];
 for(const room of ['living','kids','bedroom','kitchen','study']){
  const post=await service(t,{key:'secret',fetcher:async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/images/edits');assert.equal(options.body.getAll('image[]').length,1);assert.equal(options.body.get('input_fidelity'),'high');assert.match(options.body.get('prompt'),/exact KRISTALLER/);prompts.push(options.body.get('prompt'));return Response.json({data:[{b64_json:'result'}]})}});
  const res=await post({room,productId:'crystal',consent:true});assert.equal(res.status,200);assert.equal((await res.json()).approximate,true);
 }assert.equal(new Set(prompts).size,5);
});
test('own room sends room first, IKEA reference second, and preserves architecture with placement hint',async t=>{
 const post=await service(t,{key:'secret',fetcher:async(_url,options)=>{const form=options.body;assert.equal(form.get('quality'),'high');assert.equal(form.getAll('image[]').length,2);assert.equal(form.getAll('image[]')[0].name,'room.jpg');assert.equal(form.getAll('image[]')[1].name,'ikea-product.jpg');assert.match(form.get('prompt'),/exact architecture/);assert.match(form.get('prompt'),/x=42%, y=23%/);assert.match(form.get('prompt'),/switched OFF/);return Response.json({data:[{b64_json:'result'}]})}});
 const res=await post({room:'my',productId:'crystal',consent:true,photo:pixel,position:{x:42,y:23}});assert.equal(res.status,200);assert.equal((await res.json()).image,'data:image/png;base64,result');
});
test('provider errors never leak provider bodies or credentials',async t=>{const post=await service(t,{key:'secret',fetcher:async()=>Response.json({error:'private provider detail secret'},{status:401})});const res=await post({room:'living',productId:'crystal',consent:true});assert.equal(res.status,502);assert.doesNotMatch(JSON.stringify(await res.json()),/private provider detail|secret/)});
test('integrated endpoint reads actual IKEA asset from allowlisted product manifest',async t=>{const post=await service(t,{key:'test',fetcher:async(_url,options)=>{assert.ok(options.body.getAll('image[]')[0].size>1000);assert.match(options.body.get('prompt'),/KRISTALLER/);return Response.json({data:[{b64_json:'result'}]})}},true);assert.equal((await post({room:'living',productId:'crystal',consent:true})).status,200)});

// The second handler simulates a backend restart: it must reuse the on-disk scene.
test('catalogue cache survives handler restart and explicit regeneration bypasses it',async t=>{
 const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const cacheDir=await mkdtemp(join(tmpdir(),'lighting-cache-'));t.after(()=>rm(cacheDir,{recursive:true,force:true}));let calls=0;
 const options={key:'test',cacheDir,fetcher:async(_url,options)=>{calls++;assert.equal(options.body.get('quality'),'medium');assert.equal(options.body.get('input_fidelity'),'high');return Response.json({data:[{b64_json:'cached-scene'}]})}};
 const body={room:'living',productId:'crystal',consent:true};const first=await service(t,options);assert.equal((await first(body)).status,200);
 const second=await service(t,options);assert.equal((await (await second(body)).json()).cached,true);assert.equal(calls,1);
 assert.equal((await second({...body,regenerate:true})).status,200);assert.equal(calls,2);
});
test('customer photographs are never persisted in the catalogue cache',async t=>{
 const {mkdtemp,rm,readdir}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const cacheDir=await mkdtemp(join(tmpdir(),'lighting-private-'));t.after(()=>rm(cacheDir,{recursive:true,force:true}));
 const post=await service(t,{key:'test',cacheDir,fetcher:async()=>Response.json({data:[{b64_json:'private-result'}]})});
 assert.equal((await post({room:'my',productId:'crystal',photo:pixel,consent:true})).status,200);assert.deepEqual(await readdir(cacheDir),[]);
});

test('distinct catalogue rooms queue instead of returning a busy error',async t=>{
 let calls=0,unlock,entered;const started=new Promise(resolve=>{entered=resolve});const hold=new Promise(resolve=>{unlock=resolve});
 const post=await service(t,{key:'test',fetcher:async()=>{calls++;if(calls===1){entered();await hold}return Response.json({data:[{b64_json:'room-'+calls}]})}});
 const first=post({room:'bedroom',productId:'crystal',consent:true});await started;
 const second=post({room:'kitchen',productId:'crystal',consent:true});unlock();
 assert.equal((await first).status,200);assert.equal((await second).status,200);assert.equal(calls,2);
});
test('leaving a catalogue room does not abort it; duplicate requests share the generated result',async t=>{
 const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const cacheDir=await mkdtemp(join(tmpdir(),'lighting-inflight-'));t.after(()=>rm(cacheDir,{recursive:true,force:true}));
 let calls=0,unlock,entered,providerSignal;const started=new Promise(resolve=>{entered=resolve});const hold=new Promise(resolve=>{unlock=resolve});
 const post=await service(t,{key:'test',cacheDir,fetcher:async(_url,options)=>{calls++;providerSignal=options.signal;entered();await hold;return Response.json({data:[{b64_json:'shared-room'}]})}});
 const body={room:'bedroom',productId:'crystal',consent:true},controller=new AbortController();
 const abandoned=post(body,{},controller.signal).catch(()=>null);await started;controller.abort();const second=post(body);
 setTimeout(()=>unlock(),30);const response=await second;await abandoned;
 assert.equal(response.status,200);assert.equal(calls,1);assert.equal(providerSignal.aborted,false);
 assert.equal((await (await post(body)).json()).cached,true);
});
