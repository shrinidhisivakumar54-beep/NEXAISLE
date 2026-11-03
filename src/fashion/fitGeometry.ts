export type FitPoint={x:number;y:number};
export type FitBody={left:FitPoint;right:FitPoint;waist:FitPoint;hipLeft?:FitPoint;hipRight?:FitPoint;kneeLeft?:FitPoint;kneeRight?:FitPoint;ankleLeft?:FitPoint;ankleRight?:FitPoint;confidence?:'full'|'upper'|'manual'};
export type FitAdjustments={width:number;length:number;x:number;y:number;rotation:number};
export const defaultAdjustments:FitAdjustments={width:100,length:100,x:0,y:0,rotation:0};
const profiles:Record<string,{kind:string;shoulderY:number;span:number;waistY:number;hipY:number;hem:number}>={
f12:{kind:'shirt',shoulderY:.20,span:.62,waistY:.85,hipY:.95,hem:1},f1:{kind:'shirt',shoulderY:.17,span:.57,waistY:.84,hipY:.95,hem:1},f6:{kind:'shirt',shoulderY:.15,span:.57,waistY:.83,hipY:.96,hem:1},f0:{kind:'jacket',shoulderY:.23,span:.6,waistY:.82,hipY:.94,hem:1},f2:{kind:'jacket',shoulderY:.18,span:.59,waistY:.81,hipY:.94,hem:1},f7:{kind:'jacket',shoulderY:.15,span:.59,waistY:.81,hipY:.94,hem:1},f10:{kind:'jacket',shoulderY:.1,span:.68,waistY:.81,hipY:.94,hem:1},f8:{kind:'coat',shoulderY:.09,span:.64,waistY:.43,hipY:.62,hem:1},f4:{kind:'dress',shoulderY:.09,span:.58,waistY:.38,hipY:.56,hem:1},f9:{kind:'skirt',shoulderY:0,span:.84,waistY:.03,hipY:.25,hem:1},f3:{kind:'trousers',shoulderY:0,span:.83,waistY:.04,hipY:.18,hem:1}};
const mean=(a:FitPoint,b:FitPoint)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function garmentGeometry(id:string,body:FitBody,w:number,h:number,adjust:FitAdjustments=defaultAdjustments){
 const profile=profiles[id]??profiles.f1,px=(p:FitPoint)=>({x:p.x*w,y:p.y*h}),left=px(body.left),right=px(body.right),shoulder=mean(left,right),waist=px(body.waist),span=Math.max(1,Math.hypot(right.x-left.x,right.y-left.y)),shoulderAxis={x:(right.x-left.x)/span,y:(right.y-left.y)/span},torso=Math.max(span*.65,Math.hypot(waist.x-shoulder.x,waist.y-shoulder.y));
 const hip=body.hipLeft&&body.hipRight?px(mean(body.hipLeft,body.hipRight)):{x:waist.x,y:waist.y+torso*.42},hipWidth=body.hipLeft&&body.hipRight?Math.hypot((body.hipRight.x-body.hipLeft.x)*w,(body.hipRight.y-body.hipLeft.y)*h)*1.45:span*.96;
 const knee=body.kneeLeft&&body.kneeRight?px(mean(body.kneeLeft,body.kneeRight)):{x:hip.x,y:hip.y+torso*1.1},ankle=body.ankleLeft&&body.ankleRight?px(mean(body.ankleLeft,body.ankleRight)):{x:knee.x,y:knee.y+torso*1.05},bottom=['skirt','trousers'].includes(profile.kind),base=bottom?hipWidth/profile.span:span/profile.span;const hipSpan=body.hipLeft&&body.hipRight?Math.hypot((body.hipRight.x-body.hipLeft.x)*w,(body.hipRight.y-body.hipLeft.y)*h):0,axis=bottom&&hipSpan?{x:(body.hipRight!.x-body.hipLeft!.x)*w/hipSpan,y:(body.hipRight!.y-body.hipLeft!.y)*h/hipSpan}:shoulderAxis;
 // Dress hem uses a midi position between detected knees and ankles. Skirts keep their source flare.
 const hem=profile.kind==='dress'?{x:knee.x*.55+ankle.x*.45,y:knee.y*.55+ankle.y*.45}:profile.kind==='coat'?{x:knee.x,y:knee.y}:profile.kind==='skirt'?{x:knee.x*.7+ankle.x*.3,y:knee.y*.7+ankle.y*.3}:profile.kind==='trousers'?ankle:{x:hip.x,y:waist.y+torso*.27};
 const control=bottom?[{v:0,p:waist},{v:profile.hipY,p:hip},{v:1,p:hem}]:[{v:profile.shoulderY,p:shoulder},{v:profile.waistY,p:waist},{v:profile.hipY,p:hip},{v:1,p:hem}];
 // Tops use the shoulder-to-waist interval; their short hem never jumps to the knees.
 if(['shirt','jacket'].includes(profile.kind))control.splice(2,1);
 function map(u:number,v:number):FitPoint{let a=control[0],b=control[1];for(let i=1;i<control.length;i++){a=control[i-1];b=control[i];if(v<=b.v)break}const t=(v-a.v)/Math.max(.001,b.v-a.v),center={x:a.p.x+(b.p.x-a.p.x)*t,y:a.p.y+(b.p.y-a.p.y)*t};let shape=1;
 if(!bottom&&v>=profile.shoulderY){const progress=clamp((v-profile.shoulderY)/(profile.waistY-profile.shoulderY),0,1);shape=1-progress*.1}
 // Below a dress waist, use one uniform horizontal scale: retain the photographic skirt silhouette.
 if(profile.kind==='dress'&&v>=profile.waistY)shape=.9;
 let pointX=center.x+axis.x*(u-.5)*base*shape*adjust.width/100,pointY=center.y+axis.y*(u-.5)*base*shape*adjust.width/100;
 if(profile.kind==='trousers'&&v>profile.hipY&&body.hipLeft&&body.hipRight&&body.kneeLeft&&body.kneeRight&&body.ankleLeft&&body.ankleRight){const side=u<.5?'Left':'Right',leg=[{v:profile.hipY,p:px(body[side==='Left'?'hipLeft':'hipRight']!)},{v:.58,p:px(body[side==='Left'?'kneeLeft':'kneeRight']!)},{v:1,p:px(body[side==='Left'?'ankleLeft':'ankleRight']!)}],a=v<=.58?leg[0]:leg[1],b=v<=.58?leg[1]:leg[2],part=(v-a.v)/(b.v-a.v),legCenter={x:a.p.x+(b.p.x-a.p.x)*part,y:a.p.y+(b.p.y-a.p.y)*part},blend=clamp((v-profile.hipY)/.12,0,1),legAcross=(u-(side==='Left'?.25:.75))*base*adjust.width/100;pointX=pointX*(1-blend)+(legCenter.x+axis.x*legAcross)*blend;pointY=pointY*(1-blend)+(legCenter.y+axis.y*legAcross)*blend}
 const dx=pointX-shoulder.x,dy=(pointY-shoulder.y)*adjust.length/100,angle=adjust.rotation*Math.PI/180;
 return {x:shoulder.x+dx*Math.cos(angle)-dy*Math.sin(angle)+adjust.x/100*w,y:shoulder.y+dx*Math.sin(angle)+dy*Math.cos(angle)+adjust.y/100*h}}
 return {map,kind:profile.kind,profile,lowerBodyKnown:!!(body.kneeLeft&&body.kneeRight&&body.ankleLeft&&body.ankleRight),shoulder,waist,hip,knee,ankle,hem};
}
