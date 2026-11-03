import {Readable} from 'node:stream';
import {createHandler} from './try-on.mjs';
// Vercel parses JSON bodies before invoking Node handlers. Reconstruct the
// readable input expected by the existing local API without changing its logic.
export function createVercelHandler(options={}){
 let handler;
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  try{
   handler??=createHandler({lightingCacheDir:null,outputFormat:'jpeg',...options});
   const url=new URL(req.url,'https://nexaisle.invalid');
   let input=req;
   if(req.body!==undefined){const body=typeof req.body==='string'||Buffer.isBuffer(req.body)?req.body:JSON.stringify(req.body);if(Buffer.byteLength(body)>4_000_000){res.writeHead(413,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'The photos are too large for hosted generation. Choose a smaller photo (under 2 MB) and try again.'}));return}input=Readable.from([body]);}
   const route=url.searchParams.get('route')??req.query?.route;input.url=route?'/api/'+(Array.isArray(route)?route.join('/'):route):url.pathname;input.method=req.method;input.headers=req.headers;
   await handler(input,res);
  }catch(error){console.error('NEXAISLE API failed',{name:error?.name||'Error'});if(!res.headersSent){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'The AI server could not start. Check the server-side image provider settings in Vercel.'}))}else if(!res.writableEnded)res.end();}
 };
}
