import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createModelHandler} from './model-3d.mjs';

const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const endpoint='https://api.meshy.ai/openapi/v1/image-to-3d';
async function service(t,options){
  const server=createServer(createModelHandler({pollIntervalMs:0,...options}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  return (path,body,headers={})=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
}
function minimalGlb(){
  const json=Buffer.from('{"asset":{"version":"2.0"}}     ');const padded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);return Buffer.concat([header,padded]);
}
test('3D status reports missing key without making provider calls',async t=>{
  const request=await service(t,{key:'',fetcher:()=>{throw Error('Must not call provider')}});
  assert.deepEqual(await (await request('/api/3d/status')).json(),{available:false,provider:'Meshy'});
  assert.equal((await request('/api/3d/jobs',{consent:true,image})).status,503);
});
test('3D requires consent, actual image data and an allowed origin',async t=>{
  const request=await service(t,{key:'secret',fetcher:()=>{throw Error('Must not call provider')}});
  assert.equal((await request('/api/3d/jobs',{image,consent:false})).status,400);
  assert.equal((await request('/api/3d/jobs',{image:'data:image/png;base64,YWJjZA==',consent:true})).status,400);
  assert.equal((await request('/api/3d/jobs',{image,consent:true},{Origin:'https://evil.example'})).status,403);
  assert.equal((await request('/api/3d/jobs',{image,consent:false},{Origin:'http://localhost:5173'})).status,400);
  assert.equal((await request('/api/3d/jobs',{image,consent:true},{'Content-Type':'text/plain'})).status,415);
});
test('creates a single paid job, polls progress and downloads a validated model without forwarding key',async t=>{
  let creates=0,polls=0;const glb=minimalGlb();
  const request=await service(t,{key:'private',fetcher:async(url,options)=>{
    assert.equal(options.redirect,'error');
    if(url===endpoint){creates++;assert.equal(options.headers.Authorization,'Bearer private');assert.deepEqual(JSON.parse(options.body),{image_url:image,should_texture:true,enable_pbr:true});return Response.json({result:'provider-task-1'});}
    if(url===endpoint+'/provider-task-1'){polls++;return Response.json(polls===1?{status:'IN_PROGRESS',progress:42}:{status:'SUCCEEDED',progress:100,model_urls:{glb:'https://assets.meshy.ai/models/example.glb'}});}
    assert.equal(url,'https://assets.meshy.ai/models/example.glb');assert.equal(options.headers,undefined);return new Response(glb);
  }});
  const response=await request('/api/3d/jobs',{image,consent:true});assert.equal(response.status,202);const {id}=await response.json();assert.match(id,/^[a-f0-9-]{36}$/);
  assert.deepEqual(await (await request('/api/3d/jobs/'+id)).json(),{id,status:'IN_PROGRESS',progress:42});
  assert.equal((await (await request('/api/3d/jobs/'+id)).json()).status,'SUCCEEDED');
  const download=await request(`/api/3d/jobs/${id}/model`);assert.equal(download.status,200);assert.equal(download.headers.get('content-type'),'model/gltf-binary');assert.deepEqual(Buffer.from(await download.arrayBuffer()),glb);assert.equal(creates,1);
});
test('unknown and invalid job IDs cannot trigger provider fetches',async t=>{
  const request=await service(t,{key:'key',fetcher:()=>{throw Error('Must not call provider')}});
  assert.equal((await request('/api/3d/jobs/00000000-0000-0000-0000-000000000000')).status,404);
  assert.equal((await request('/api/3d/jobs/../../../something')).status,404);
});
test('active conversions block another paid job and failures permit a new explicit request',async t=>{
  let fail=false,creates=0;
  const request=await service(t,{key:'key',fetcher:async(url)=>url===endpoint?(creates++,Response.json({result:'task-'+creates})):Response.json({status:fail?'FAILED':'IN_PROGRESS',progress:25,task_error:{message:'private detail'}})});
  const first=await (await request('/api/3d/jobs',{image,consent:true})).json();
  assert.equal((await request('/api/3d/jobs',{image,consent:true})).status,429);assert.equal(creates,1);
  fail=true;const status=await (await request('/api/3d/jobs/'+first.id)).json();assert.equal(status.status,'FAILED');assert.doesNotMatch(status.error,/private detail/);
  assert.equal((await request('/api/3d/jobs',{image,consent:true})).status,202);assert.equal(creates,2);
});
test('untrusted model download addresses are never fetched',async t=>{
  let calls=0;
  const request=await service(t,{key:'key',fetcher:async(url)=>{calls++;return Response.json(url===endpoint?{result:'task'}:{status:'SUCCEEDED',model_urls:{glb:'https://assets.meshy.ai.attacker.example/model.glb'}});}});
  const {id}=await (await request('/api/3d/jobs',{image,consent:true})).json();
  const status=await (await request('/api/3d/jobs/'+id)).json();assert.equal(status.status,'FAILED');assert.match(status.error,/unsupported model download address/);
  assert.equal((await request(`/api/3d/jobs/${id}/model`)).status,409);assert.equal(calls,2);
});
test('oversized or invalid GLB response is rejected',async t=>{
  let mode='size';
  const request=await service(t,{key:'key',fetcher:async(url)=>{
    if(url===endpoint)return Response.json({result:'task'});
    if(url.startsWith(endpoint+'/'))return Response.json({status:'SUCCEEDED',model_urls:{glb:'https://assets.meshy.ai/model.glb'}});
    return new Response('not a model',{headers:mode==='size'?{'content-length':String(60*1024*1024)}:{}});
  }});
  const {id}=await (await request('/api/3d/jobs',{image,consent:true})).json();
  assert.equal((await request(`/api/3d/jobs/${id}/model`)).status,502);
  mode='invalid';const response=await request(`/api/3d/jobs/${id}/model`);assert.equal(response.status,502);assert.match((await response.json()).error,/not a supported GLB/);
});
test('provider failures are sanitized and never retried automatically',async t=>{
  let calls=0;const request=await service(t,{key:'key',fetcher:async()=>{calls++;return Response.json({error:'secret provider diagnostic'},{status:401});}});
  const response=await request('/api/3d/jobs',{image,consent:true});assert.equal(response.status,502);const output=JSON.stringify(await response.json());assert.match(output,/HTTP 401/);assert.doesNotMatch(output,/secret provider diagnostic/);assert.equal(calls,1);
});
