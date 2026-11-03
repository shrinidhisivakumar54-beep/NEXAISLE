import type { Pose, Results } from '@mediapipe/pose';
export type Point={x:number;y:number};
export type BodyAnchors={left:Point;right:Point;waist:Point};
let loading:Promise<void>|null=null;
let queue:Promise<unknown>=Promise.resolve();
declare global {interface Window {Pose?:typeof Pose}}
function loadRuntime(){if(window.Pose)return Promise.resolve();if(!loading)loading=new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src='/pose/pose.js';script.onload=()=>resolve();script.onerror=()=>reject(new Error('The local alignment model could not load. Use the three-point tool.'));document.head.appendChild(script)}).catch(e=>{loading=null;throw e});return loading}
/** Serialize independent requests: never let the older WebAssembly runtime overlap graphs. */
export function detectBody(image:HTMLImageElement|HTMLVideoElement,mirrored:boolean):Promise<BodyAnchors|null>{
 const work=async()=>{await loadRuntime();if(!window.Pose)throw new Error('Alignment is unavailable. Use the three-point tool.');const pose=new window.Pose({locateFile:file=>'/pose/'+file});let result:BodyAnchors|null=null;
 pose.setOptions({modelComplexity:0,smoothLandmarks:false,enableSegmentation:false,minDetectionConfidence:.5,minTrackingConfidence:.5});
 pose.onResults((results:Results)=>{const points=results.poseLandmarks;if(!points?.length)return;const selected=[points[11],points[12],points[23],points[24]];if(selected.some(p=>!p||(p.visibility??0)<.45||p.x<0||p.x>1||p.y<0||p.y>1))return;const convert=(p:Point)=>({x:mirrored?1-p.x:p.x,y:p.y});const a=convert(selected[0]),b=convert(selected[1]);const left=a.x<b.x?a:b,right=a.x<b.x?b:a;const waist=convert({x:(selected[2].x+selected[3].x)/2,y:(selected[2].y+selected[3].y)/2});if(right.x-left.x<.04||waist.y<(left.y+right.y)/2+.06)return;result={left,right,waist}});
 try{await pose.send({image});return result}finally{await pose.close()}
 };const task=queue.then(work,work);queue=task.catch(()=>{});return task;
}
export function imageBox(containerWidth:number,containerHeight:number,imageWidth:number,imageHeight:number){const scale=Math.min(containerWidth/imageWidth,containerHeight/imageHeight);const width=imageWidth*scale,height=imageHeight*scale;return {width,height,left:(containerWidth-width)/2,top:(containerHeight-height)/2}}
/** Fit a garment's shoulder band and torso length independently, rather than sizing its sleeves to the body. */
export function garmentFit(anchors:BodyAnchors,imageWidth:number,imageHeight:number,name:string){
 const dx=(anchors.right.x-anchors.left.x)*imageWidth,dy=(anchors.right.y-anchors.left.y)*imageHeight;
 const shoulder=Math.hypot(dx,dy);const center={x:(anchors.left.x+anchors.right.x)/2,y:(anchors.left.y+anchors.right.y)/2};
 const torso=Math.hypot((anchors.waist.x-center.x)*imageWidth,(anchors.waist.y-center.y)*imageHeight);
 const fitted=/dress|vest/i.test(name),long=/dress|coat/i.test(name),bottom=/trousers|skirt|boots|sneakers/i.test(name);
 if(bottom)return null;
 const sourceShoulderSpan=fitted?.56:.46;
 return {x:center.x*100,y:center.y*100,width:shoulder/sourceShoulderSpan/imageWidth*100,height:torso*(long?1.9:1.12)/.81/imageHeight*100,angle:Math.atan2(dy,dx)*180/Math.PI,shoulderY:.14};
}
