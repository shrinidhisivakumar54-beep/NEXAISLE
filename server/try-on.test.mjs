import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHandler} from './try-on.mjs';
const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
async function service(t,options){const server=createServer(createHandler(options));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));const url=`http://127.0.0.1:${server.address().port}`;return (data,headers={})=>fetch(url+'/api/try-on',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(data)});}
test('missing credentials fail clearly without calling provider',async t=>{const post=await service(t,{key:'',fetcher:()=>{throw Error('Unexpected provider call')}});const res=await post({});assert.equal(res.status,503);assert.match((await res.json()).error,/not connected/);});
test('requires consent, known pose, valid image and matching origin',async t=>{const post=await service(t,{key:'test',fetcher:()=>{throw Error('Unexpected provider call')}});assert.equal((await post({pose:'front',consent:false})).status,400);assert.equal((await post({pose:'invalid',consent:true})).status,400);assert.equal((await post({pose:'front',consent:true,person:'invalid'})).status,400);assert.equal((await post({}, {Origin:'https://other.example'})).status,403);});
test('sends two references and pose instructions and returns generated output',async t=>{let called=0;const post=await service(t,{key:'server-secret',fetcher:async(url,options)=>{called++;assert.equal(url,'https://api.openai.com/v1/images/edits');assert.equal(options.headers.Authorization,'Bearer server-secret');assert.equal(options.body.getAll('image[]').length,2);assert.match(options.body.get('prompt'),/three-quarter/);assert.equal(options.body.get('input_fidelity'),'high');return Response.json({data:[{b64_json:'generated'}]});}});const res=await post({person:pixel,garment:pixel,pose:'turn',consent:true});assert.equal(res.status,200);assert.deepEqual(await res.json(),{image:'data:image/png;base64,generated'});assert.equal(called,1);});
test('provider errors are sanitized',async t=>{const post=await service(t,{key:'test',fetcher:async()=>Response.json({error:'private provider detail'},{status:401})});const res=await post({person:pixel,garment:pixel,pose:'front',consent:true});assert.equal(res.status,502);assert.doesNotMatch(JSON.stringify(await res.json()),/private provider detail/);});
test('ZaoAPI uses the configured endpoint, model and two images',async t=>{
  const post=await service(t,{key:'test',baseUrl:'https://api.miaoquai.com/v1/',model:'gpt-image-1',fetcher:async(url,options)=>{
    assert.equal(url,'https://api.miaoquai.com/v1/images/edits');
    assert.equal(options.redirect,'error');
    assert.equal(options.body.get('model'),'gpt-image-1');
    assert.equal(options.body.getAll('image[]').length,2);
    return Response.json({data:[{b64_json:'generated'}]});
  }});
  assert.equal((await post({person:pixel,garment:pixel,pose:'front',consent:true})).status,200);
});
test('rejects unexpected provider destinations',()=>{
  assert.throws(()=>createHandler({baseUrl:'http://api.miaoquai.com/v1'}),/OPENAI_BASE_URL/);
  assert.throws(()=>createHandler({baseUrl:'https://other.example/v1'}),/OPENAI_BASE_URL/);
});
test('accepts Vite loopback origins through the proxy, rejects unrelated origins',async t=>{
  const post=await service(t,{key:'test',fetcher:()=>{throw Error('Must not generate without consent')}});
  for(const origin of ['http://localhost:5173','http://127.0.0.1:5174','http://[::1]:5175']) {
    const response=await post({pose:'front',consent:false},{Origin:origin});
    assert.equal(response.status,400,origin+' should reach consent validation');
  }
  for(const origin of ['https://other.example','http://localhost.attacker.example:5173','http://127.0.0.1:9000','null','bad-url']) {
    assert.equal((await post({}, {Origin:origin})).status,403,origin);
  }
});
