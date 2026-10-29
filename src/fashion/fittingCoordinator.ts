export type FittingJob={key:string;photo:string;revision:number;garmentId:string;garmentName:string;pose:string;provider:string;model:string};
export type FittingResult={image:string;durationMs?:number};
type Entry={epoch:number;controller:AbortController;consumers:Set<object>;promise:Promise<FittingResult>;started:boolean};
export const FITTING_VERSION='photo-fit-v3';
export const fittingKey=(revision:number,id:string,pose:string,provider:string,model:string,mode=FITTING_VERSION)=>JSON.stringify([revision,id,pose,provider,model,mode]);
const cancelled=()=>Object.assign(new Error('Fitting cancelled.'),{name:'AbortError'});
/** Single paid-request lane, shared by every fitting view. Navigation cancels queued work, not an already submitted image. */
export function createFittingCoordinator(generate:(job:FittingJob,signal:AbortSignal)=>Promise<FittingResult>,options:{interval?:number;capacity?:number;maxBytes?:number}={}){
 const cache=new Map<string,string>(),failures=new Map<string,Error>(),flights=new Map<string,Entry>(),listeners=new Set<()=>void>();let epoch=0,tail:Promise<unknown>=Promise.resolve(),lastStarted=0;
 const emit=()=>listeners.forEach(listener=>listener());
 const put=(key:string,image:string)=>{cache.delete(key);cache.set(key,image);let bytes=[...cache.values()].reduce((sum,value)=>sum+value.length*2,0);while(cache.size>(options.capacity??16)||(bytes>(options.maxBytes??64*1024*1024)&&cache.size>1)){const oldest=cache.keys().next().value!;bytes-=cache.get(oldest)!.length*2;cache.delete(oldest)}failures.delete(key);emit()};
 return {
 get:(key:string)=>cache.get(key),put,
 failure:(key:string)=>failures.get(key),
 retry:(key:string)=>{failures.delete(key);emit()},
 subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}},
 clear:()=>{epoch++;for(const entry of flights.values())entry.controller.abort();flights.clear();cache.clear();failures.clear();emit()},
 async request(job:FittingJob,signal?:AbortSignal):Promise<FittingResult>{
  if(signal?.aborted)throw cancelled();const image=cache.get(job.key);if(image)return {image};const failed=failures.get(job.key);if(failed)throw failed;
  let entry=flights.get(job.key);
  if(!entry){const next:Entry={epoch,controller:new AbortController(),consumers:new Set(),promise:Promise.resolve({image:''}),started:false};entry=next;flights.set(job.key,next);
   const run=async()=>{try{if(next.epoch!==epoch||!next.consumers.size)throw cancelled();const delay=Math.max(0,(options.interval??3100)-(Date.now()-lastStarted));if(delay)await new Promise(resolve=>setTimeout(resolve,delay));if(next.epoch!==epoch||!next.consumers.size)throw cancelled();next.started=true;lastStarted=Date.now();emit();const result=await generate(job,next.controller.signal);if(next.epoch!==epoch||next.controller.signal.aborted)throw cancelled();if(!result.image)throw Error('The fitting service returned no image.');put(job.key,result.image);return result}catch(error){if(next.epoch===epoch&&(error as Error).name!=='AbortError'){failures.set(job.key,error as Error);emit()}throw error}finally{if(flights.get(job.key)===next)flights.delete(job.key);emit()}};
   next.promise=tail.then(run);tail=next.promise.catch(()=>{});
  }
  const target=entry,consumer={};target.consumers.add(consumer);
  return new Promise((resolve,reject)=>{let settled=false;const finish=(error?:unknown,result?:FittingResult)=>{if(settled)return;settled=true;target.consumers.delete(consumer);signal?.removeEventListener('abort',abort);if(error)reject(error);else resolve(result!)};const abort=()=>finish(cancelled());signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();target.promise.then(result=>finish(undefined,result),error=>finish(error))});
 },
 pending:(key:string)=>flights.has(key),active:()=>[...flights.values()].some(entry=>entry.started),
 size:()=>cache.size
 }
}
