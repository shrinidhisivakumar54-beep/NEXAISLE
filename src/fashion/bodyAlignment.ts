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

export type PreparedAvatar={image:string;foreground:string;width:number;height:number;anchors:BodyAnchors|null;originalAnchors:BodyAnchors|null;crop:{x:number;y:number;width:number;height:number};originalWidth:number;originalHeight:number};
export function cropAnchors(a:BodyAnchors,crop:PreparedAvatar['crop'],w:number,h:number):BodyAnchors{const point=(p:Point)=>({x:(p.x*w-crop.x)/crop.width,y:(p.y*h-crop.y)/crop.height});return {left:point(a.left),right:point(a.right),waist:point(a.waist)}}
/** One local segmentation/landmark pass per reference photo. No network image upload. */
export function preparePhotoAvatar(image:HTMLImageElement):Promise<PreparedAvatar>{
 const work=async()=>{await loadRuntime();if(!window.Pose)throw Error('Body processing could not load.');const pose=new window.Pose({locateFile:file=>'/pose/'+file});let output:PreparedAvatar|null=null;
 pose.setOptions({modelComplexity:0,smoothLandmarks:false,enableSegmentation:true,smoothSegmentation:false,minDetectionConfidence:.35,minTrackingConfidence:.35});
 pose.onResults((results:Results)=>{if(!results.segmentationMask||!results.poseLandmarks?.length)return;const w=image.naturalWidth,h=image.naturalHeight,points=results.poseLandmarks;const valid=(i:number)=>(points[i]?.visibility??0)>.3&&points[i].x>0&&points[i].x<1&&points[i].y>0&&points[i].y<1;
 let anchors:BodyAnchors|null=null;if(valid(11)&&valid(12)){const a=points[11],b=points[12],left=a.x<b.x?a:b,right=a.x<b.x?b:a,middle={x:(a.x+b.x)/2,y:(a.y+b.y)/2},shoulder=Math.hypot((right.x-left.x)*w,(right.y-left.y)*h);const hips=valid(23)&&valid(24)?{x:(points[23].x+points[24].x)/2,y:(points[23].y+points[24].y)/2}:null;const waist=hips&&hips.y>middle.y+.06?hips:{x:middle.x,y:middle.y+shoulder*1.42/h};if(right.x-left.x>.035)anchors={left:{x:left.x,y:left.y},right:{x:right.x,y:right.y},waist}}
 const mask=document.createElement('canvas');mask.width=w;mask.height=h;const ctx=mask.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(results.segmentationMask,0,0,w,h);const m=ctx.getImageData(0,0,w,h),d=m.data,n=w*h,seen=new Uint8Array(n),q=new Int32Array(n);let seed=-1;const cx=Math.round((anchors?(anchors.left.x+anchors.right.x)/2:points[0].x)*w),cy=Math.round((anchors?(anchors.left.y+anchors.right.y)/2+.03:points[0].y)*h);for(let r=0;r<50&&seed<0;r+=3)for(let y=Math.max(0,cy-r);y<Math.min(h,cy+r+1);y++)for(let x=Math.max(0,cx-r);x<Math.min(w,cx+r+1);x++){if(d[(y*w+x)*4+3]>128){seed=y*w+x;break}}if(seed<0)return;
 let head=0,tail=1,minX=w,minY=h,maxX=0,maxY=0;q[0]=seed;seen[seed]=1;const push=(i:number)=>{if(!seen[i]&&d[i*4+3]>55){seen[i]=1;q[tail++]=i}};while(head<tail){const i=q[head++],x=i%w,y=Math.floor(i/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);if(x)push(i-1);if(x<w-1)push(i+1);if(i>=w)push(i-w);if(i<n-w)push(i+w)}if(tail<n*.008)return;for(let i=0;i<n;i++)d[i*4+3]=seen[i]?Math.round(Math.max(0,Math.min(1,(d[i*4+3]/255-.18)/.64))*255):0;ctx.putImageData(m,0,0);ctx.globalCompositeOperation='source-in';ctx.drawImage(image,0,0,w,h);ctx.globalCompositeOperation='source-over';
 const pad=Math.round(w*.035),crop={x:Math.max(0,minX-pad),y:Math.max(0,minY-pad),width:0,height:0};crop.width=Math.min(w,maxX+pad)-crop.x;crop.height=Math.min(h,maxY+pad)-crop.y;const c=document.createElement('canvas');c.width=crop.width;c.height=crop.height;const out=c.getContext('2d')!;out.drawImage(mask,crop.x,crop.y,crop.width,crop.height,0,0,c.width,c.height);const person=c.toDataURL('image/png');
 // Keep face and upper hair in front of the clothing layer; never let a neckline cover the face.
 const foreground=document.createElement('canvas');foreground.width=c.width;foreground.height=c.height;const fg=foreground.getContext('2d')!;if(anchors){fg.save();fg.beginPath();const ly=anchors.left.y*h-crop.y,ry=anchors.right.y*h-crop.y;fg.moveTo(0,0);fg.lineTo(c.width,0);fg.lineTo(c.width,ry-5);fg.lineTo(0,ly-5);fg.closePath();fg.clip();fg.drawImage(c,0,0);fg.restore()}
 output={image:person,foreground:foreground.toDataURL('image/png'),width:c.width,height:c.height,anchors:anchors?cropAnchors(anchors,crop,w,h):null,originalAnchors:anchors,crop,originalWidth:w,originalHeight:h};
 });try{await pose.send({image});if(!output)throw Error('We couldn’t isolate one person. Choose a clear photo of just you, with your shoulders visible.');return output}finally{await pose.close()}};
 const task=queue.then(work,work);queue=task.catch(()=>{});return task;
}
