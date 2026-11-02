import {useEffect,useRef,useState} from 'react';
import {buildLightField,relightPixels,type LightSource,type FixtureKind,type LightField} from './relighting';
import './relighting.css';
type Props={src:string;alt:string;on:boolean;night:boolean;tone:'warm'|'white';strength:number;sources:readonly LightSource[];kind:FixtureKind;className?:string;onLoad?:(width:number,height:number)=>void;onError?:()=>void};
export default function RelitPhoto({src,alt,on,night,tone,strength,sources,kind,className='',onLoad,onError}:Props){
 const canvas=useRef<HTMLCanvasElement>(null),data=useRef<{pixels:ImageData;field:LightField;output:ImageData}|null>(null),callbacks=useRef({onLoad,onError});callbacks.current={onLoad,onError};
 const [ready,setReady]=useState(false),[revision,setRevision]=useState(0);
 const sourceKey=JSON.stringify(sources);
 useEffect(()=>{
  let disposed=false;setReady(false);data.current=null;
  const image=new Image();image.decoding='async';
  image.onload=()=>{
   if(disposed)return;
   try{const node=canvas.current;if(!node)return;const ctx=node.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Canvas unavailable');
    const scale=Math.min(1,1100/Math.max(image.naturalWidth,image.naturalHeight));node.width=Math.max(1,Math.round(image.naturalWidth*scale));node.height=Math.max(1,Math.round(image.naturalHeight*scale));
    ctx.drawImage(image,0,0,node.width,node.height);const pixels=ctx.getImageData(0,0,node.width,node.height);
    data.current={pixels,field:buildLightField(node.width,node.height,JSON.parse(sourceKey),kind),output:ctx.createImageData(node.width,node.height)};
    callbacks.current.onLoad?.(image.naturalWidth,image.naturalHeight);setRevision(v=>v+1);
   }catch{callbacks.current.onError?.();}
  };
  image.onerror=()=>{if(!disposed)callbacks.current.onError?.()};image.src=src;
  return()=>{disposed=true;image.onload=null;image.onerror=null;};
 },[src,sourceKey,kind]);
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>{const record=data.current,node=canvas.current;if(!record||!node)return;const ctx=node.getContext('2d');if(!ctx)return;
   relightPixels(record.pixels.data,record.field,{on,night,tone,strength},record.output.data);ctx.putImageData(record.output,0,0);setReady(true);
  });return()=>cancelAnimationFrame(frame);
 },[revision,on,night,tone,strength]);
 return <span className={`relit-photo ${className}`}><img src={src} alt={ready?'':alt} aria-hidden={ready} className={ready?'relit-fallback is-ready':'relit-fallback'}/><canvas ref={canvas} className={ready?'is-ready':''} role="img" aria-label={alt} aria-hidden={!ready}/></span>;
}
