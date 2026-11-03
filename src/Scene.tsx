import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Float, Grid } from '@react-three/drei';
import { Suspense, useEffect, useRef, useState } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { products, type Product } from './store';
import { Avatar, Trolley, Box, Tube, Sign, Garment, GroceryModel, PriceTag, type Vec3 } from './world/Models';
import { FashionProductViewer } from './fashion/RailScene';
import { findPiece } from './fashion/collection';
import { aisleNames, aislePosition, rackPosition, isBlocked } from './world/layout';
import { RealGarment } from './world/RealGarment';
export { Avatar } from './world/Models';
type View = 'first'|'walk'|'front'|'left'|'right'|'top'|'orbit'|'overview';
const cameraViews:{id:View;label:string}[]=[{id:'first',label:'First person'},{id:'walk',label:'Follow'},{id:'front',label:'Front'},{id:'left',label:'Left'},{id:'right',label:'Right'},{id:'top',label:'Above'},{id:'orbit',label:'360° orbit'},{id:'overview',label:'Store map'}];
type Props = {mode:string;onProduct?:(p:Product)=>void;onAssistant?:()=>void;focusAisle?:number|null;navigationKey?:number;paused?:boolean};
const dispatchMove=(key:string,down:boolean)=>window.dispatchEvent(new CustomEvent('nexaisle-move',{detail:{key,down}}));
function Player({fashion,view,focusAisle,navigationKey,paused}:{fashion:boolean;view:View;focusAisle?:number|null;navigationKey?:number;paused?:boolean}) {
 const group=useRef<THREE.Group>(null),controls=useRef<OrbitControlsImpl>(null),marker=useRef<THREE.Mesh>(null);
 const keys=useRef(new Set<string>()),heading=useRef(Math.PI),yaw=useRef(Math.PI),pitch=useRef(-.25),destination=useRef<THREE.Vector3|null>(null),pending=useRef(true),dragging=useRef(false),movementBasis=useRef(0);
 const {camera,gl}=useThree();const [moving,setMoving]=useState(false);const wasMoving=useRef(false);
 useEffect(()=>{
  const clear=()=>{keys.current.clear();destination.current=null;dragging.current=false};
  const down=(e:KeyboardEvent)=>{if((e.target as HTMLElement).closest('input,textarea,select,[role="dialog"]'))return;if(e.key==='Escape'){clear();return}if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())){e.preventDefault();destination.current=null;keys.current.add(e.key.toLowerCase())}};
  const up=(e:KeyboardEvent)=>keys.current.delete(e.key.toLowerCase());
  const touch=(e:Event)=>{const {key,down}=(e as CustomEvent).detail;destination.current=null;if(down)keys.current.add(key);else keys.current.delete(key)};
  const walk=(e:Event)=>{if(paused)return;const {x,z}=(e as CustomEvent).detail;if(!isBlocked(x,z,fashion,.55)){destination.current=new THREE.Vector3(x,0,z);keys.current.clear()}};
  const pointerDown=(e:PointerEvent)=>{if(e.button===2&&!paused){dragging.current=true;gl.domElement.setPointerCapture(e.pointerId)}};
  const pointerMove=(e:PointerEvent)=>{if(view==='first'&&dragging.current&&!paused){yaw.current-=e.movementX*.004;pitch.current=THREE.MathUtils.clamp(pitch.current-e.movementY*.003,-1.1,1.1)}};
  const pointerUp=()=>{dragging.current=false};const context=(e:Event)=>e.preventDefault();
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);window.addEventListener('nexaisle-move',touch);window.addEventListener('nexaisle-walk',walk);
  gl.domElement.addEventListener('pointerdown',pointerDown);gl.domElement.addEventListener('pointermove',pointerMove);gl.domElement.addEventListener('pointerup',pointerUp);gl.domElement.addEventListener('pointercancel',pointerUp);gl.domElement.addEventListener('lostpointercapture',pointerUp);gl.domElement.addEventListener('contextmenu',context);
  return()=>{clear();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);window.removeEventListener('nexaisle-move',touch);window.removeEventListener('nexaisle-walk',walk);gl.domElement.removeEventListener('pointerdown',pointerDown);gl.domElement.removeEventListener('pointermove',pointerMove);gl.domElement.removeEventListener('pointerup',pointerUp);gl.domElement.removeEventListener('pointercancel',pointerUp);gl.domElement.removeEventListener('lostpointercapture',pointerUp);gl.domElement.removeEventListener('contextmenu',context)};
 },[view,paused,fashion,gl]);
 useEffect(()=>{pending.current=true;destination.current=null;keys.current.clear()},[view]);
 useEffect(()=>{if(paused){destination.current=null;keys.current.clear()}},[paused]);
 useEffect(()=>{if(!focusAisle||!group.current)return;const [x,,z]=fashion?rackPosition(focusAisle):aislePosition(focusAisle);group.current.position.set(x,0,z+2.3);group.current.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI);heading.current=Math.PI;destination.current=null;pending.current=true},[focusAisle,navigationKey,fashion]);
 useFrame((_,dt)=>{
  if(!group.current||!controls.current)return;const g=group.current,c=controls.current;
  if(pending.current){pending.current=false;movementBasis.current=heading.current-Math.PI;yaw.current=heading.current;pitch.current=-.25;if(view==='overview'){camera.position.set(17,22,23);c.target.set(0,0,0)}else if(view!=='first'){const presets:Record<string,THREE.Vector3>={walk:new THREE.Vector3(0,2.1,-4.8),front:new THREE.Vector3(0,1.5,5.2),left:new THREE.Vector3(-5,1.6,.5),right:new THREE.Vector3(5,1.6,.5),top:new THREE.Vector3(0,7,-.2),orbit:new THREE.Vector3(-4,2.4,-4)};c.target.set(g.position.x,1.1,g.position.z);camera.position.copy(c.target).add(presets[view].clone().applyQuaternion(g.quaternion));c.update()}}
  const step=new THREE.Vector3();const k=keys.current;let manualX=0,manualZ=0;
  if(!paused){if(k.has('w')||k.has('arrowup'))manualZ-=1;if(k.has('s')||k.has('arrowdown'))manualZ+=1;if(k.has('a')||k.has('arrowleft'))manualX-=1;if(k.has('d')||k.has('arrowright'))manualX+=1;
   if(manualX||manualZ){const angle=view==='first'?yaw.current-Math.PI:view==='walk'||view==='orbit'?Math.atan2(camera.position.x-c.target.x,camera.position.z-c.target.z):view==='overview'?0:movementBasis.current;step.set(manualX,0,manualZ).normalize().applyAxisAngle(new THREE.Vector3(0,1,0),angle).multiplyScalar(Math.min(dt,.05)*2.5)}
   else if(destination.current){step.copy(destination.current).sub(g.position);step.y=0;if(step.length()<.12)destination.current=null;else step.normalize().multiplyScalar(Math.min(dt,.05)*2.5)}
  }
  const before=g.position.clone();if(step.lengthSq()>0){const facing=view==='first'?yaw.current:Math.atan2(step.x,step.z);const blocked=(x:number,z:number)=>isBlocked(x,z,fashion,.48)||(!fashion&&isBlocked(x+Math.sin(facing)*.97,z+Math.cos(facing)*.97,false,.38));if(!blocked(g.position.x+step.x,g.position.z))g.position.x+=step.x;if(!blocked(g.position.x,g.position.z+step.z))g.position.z+=step.z;if(destination.current&&g.position.distanceToSquared(before)<.000001)destination.current=null;if(view!=='first')heading.current=facing}
  if(view==='first'){heading.current=yaw.current;camera.position.set(g.position.x,1.84,g.position.z);camera.lookAt(g.position.x+Math.sin(yaw.current)*Math.cos(pitch.current),1.84+Math.sin(pitch.current),g.position.z+Math.cos(yaw.current)*Math.cos(pitch.current));}
  else if(view!=='overview'){const target=new THREE.Vector3(g.position.x,1.1,g.position.z);camera.position.add(target.clone().sub(c.target));c.target.copy(target)}
  g.quaternion.slerp(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),heading.current),1-Math.exp(-Math.min(dt,.05)*12));
  const isMoving=g.position.distanceToSquared(before)>.000001;if(wasMoving.current!==isMoving){setMoving(isMoving);wasMoving.current=isMoving}
  if(marker.current){marker.current.visible=!!destination.current;if(destination.current)marker.current.position.set(destination.current.x,.035,destination.current.z)}
  gl.domElement.dataset.playerX=g.position.x.toFixed(2);gl.domElement.dataset.playerZ=g.position.z.toFixed(2);gl.domElement.dataset.cameraMode=view;
 });
 return <><group ref={group} position={[0,0,9.5]} rotation={[0,Math.PI,0]}><group visible={view!=='first'}><Avatar moving={moving} pushing={!fashion}/></group>{!fashion&&<Trolley moving={moving}/>}</group><mesh ref={marker} visible={false} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.22,.3,32]}/><meshBasicMaterial color="#ff3d9a" depthWrite={false}/></mesh><OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.14} rotateSpeed={.65} zoomSpeed={.7} mouseButtons={{LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE}} minDistance={view==='overview'?8:2.3} maxDistance={view==='overview'?39:10} maxPolarAngle={Math.PI/2.05} minPolarAngle={.025} enablePan={false} autoRotate={view==='orbit'&&!moving&&!paused} autoRotateSpeed={1.3} enabled={!paused&&view!=='first'}/></>;
}
// Project a small DOM label from a world-space point without mounting a second React root.
function WorldLabel({title,subtitle,position,onClick,className}:{title:string;subtitle:string;position:Vec3;onClick?:()=>void;className:string}) {
 const anchor=useRef<THREE.Group>(null),element=useRef<HTMLDivElement|null>(null);const {gl,camera,size}=useThree();const callback=useRef(onClick);callback.current=onClick;
 useEffect(()=>{const wrapper=document.createElement('div');wrapper.style.cssText='position:absolute;top:0;left:0;z-index:12;';const content=document.createElement(onClick?'button':'div');content.className=className;content.appendChild(document.createTextNode(title));const small=document.createElement('small');small.textContent=subtitle;content.appendChild(small);wrapper.appendChild(content);wrapper.style.pointerEvents=onClick?'auto':'none';const click=(e:Event)=>{e.stopPropagation();callback.current?.()};content.addEventListener('click',click);gl.domElement.parentElement!.appendChild(wrapper);element.current=wrapper;return()=>{content.removeEventListener('click',click);wrapper.remove();element.current=null}},[gl,title,subtitle,className,!!onClick]);
 const world=useMemoVector();
 useFrame(()=>{if(!anchor.current||!element.current)return;anchor.current.getWorldPosition(world);world.project(camera);const visible=world.z<1&&world.z>-1&&Math.abs(world.x)<1.2&&Math.abs(world.y)<1.2;element.current.style.display=visible?'block':'none';element.current.style.transform=`translate(${(world.x*.5+.5)*size.width}px,${(-world.y*.5+.5)*size.height}px) translate(-50%,-50%)`});
 return <group ref={anchor} position={position}/>;
}
function useMemoVector(){const ref=useRef(new THREE.Vector3());return ref.current}
function Selectable({product,onProduct,children,position,rotation=0}:{product:Product;onProduct:(p:Product)=>void;children:React.ReactNode;position:Vec3;rotation?:number}) {
 const [hover,setHover]=useState(false);const group=useRef<THREE.Group>(null);
 useFrame((_,dt)=>{if(group.current){const target=hover?1.08:1;group.current.scale.lerp(new THREE.Vector3(target,target,target),1-Math.exp(-dt*12));group.current.position.z=THREE.MathUtils.damp(group.current.position.z,hover&&product.level==='fashion'?0.22:0,9,dt)}});
 return <group position={position} rotation={[0,rotation,0]} onClick={e=>{e.stopPropagation();onProduct(product)}} onPointerOver={e=>{e.stopPropagation();setHover(true);document.body.style.cursor='pointer'}} onPointerOut={()=>{setHover(false);document.body.style.cursor='auto'}}><group ref={group}>{children}</group>{hover&&<WorldLabel position={[0,.9,0]} title={product.name} subtitle="Click to inspect in 3D ↗" className="shelf-tooltip"/>}</group>;
}
function Shelf({aisle,onProduct,active}:{aisle:number;onProduct:(p:Product)=>void;active:boolean}) {
 const items=products.filter(p=>p.level==='grocery'&&p.aisle===aisle);const tiers=[.28,1.05,1.82,2.59];
 return <group position={aislePosition(aisle)}><Box position={[0,1.62,0]} scale={[3.9,3.23,.09]} color="#283344"/>{[-1.95,1.95].map(x=><Box key={x} position={[x,1.62,0]} scale={[.065,3.2,1.28]} color={active?'#ff3d9a':'#586c85'} metal={.35}/>)}{tiers.map(y=><group key={y}><Box position={[0,y,0]} scale={[3.98,.075,1.35]} color="#364253" metal={.35}/>{[-1,1].map(s=><Box key={s} position={[0,y-.025,s*.68]} scale={[4,.11,.035]} color={active?'#ff3d9a':'#009cdb'}/>)}</group>)}
 {Array.from({length:8},(_,i)=>{const p=items[i%items.length];const y=tiers[Math.floor(i/2)]+.06,x=(i%2)*1.85-.92;return <group key={i}>{[-1,1].map(side=><group key={side}>{[-.30,.30].map(copy=><Selectable key={copy} product={p} position={[x+copy,y,side*.38]} rotation={side<0?Math.PI:0} onProduct={onProduct}><group scale={1.23}><GroceryModel product={p}/></group></Selectable>)}<group rotation={[0,side<0?Math.PI:0,0]} position={[x,y-.12,side*.71]}><PriceTag product={p} position={[0,0,0]}/></group></group>)}</group>})}
 <Box position={[0,3.55,0]} scale={[3.4,.66,.1]} color="#006e9c"/>{[-1,1].map(s=><Sign key={s} position={[0,3.55,s*.061]} title={String(aisle).padStart(2,'0')+' / '+aisleNames[aisle-1]} sub={active?'YOUR SELECTED AISLE':'FRESH FINDS / EVERYDAY GOOD'} width={3.3} height={.6} dark color={active?'#829aaf':'#b7c2ce'} rotation={s<0?Math.PI:0}/>)}
 </group>;
}
function ClothingRack({rack,onProduct}:{rack:number;onProduct:(p:Product)=>void}) {
 const items=products.filter(p=>p.level==='fashion'&&p.aisle===rack);
 const shoes=items.filter(p=>/sneaker|boots|shoes/i.test(p.name));
 const hanging=items.filter(p=>!/sneaker|boots|shoes/i.test(p.name));
 // The catalogue has just 3 SKUs per rail. Multiple facings, like a real shop,
 // fill the rail without inventing products or changing selection behaviour.
 const facings=Array.from({length:Math.min(6,hanging.length*2)},(_,i)=>hanging[i%hanging.length]);
 const railY=2.04;
 return <group position={rackPosition(rack)}>
  {/* Slim satin-chrome display rail with understated supports. Garment GLBs
      already contain accurate wooden/velvet hangers and metal hooks. */}
  <Box position={[0,.055,0]} scale={[4.35,.11,1.30]} color="#eee7dd"/>
  {[-2.01,2.01].map(x=><group key={x}>
    <Tube a={[x,.12,0]} b={[x,railY+.02,0]} radius={.018} color="#b5babe"/>
    <Box position={[x,.12,0]} scale={[.38,.1,.58]} color="#9b9da2" metal={.65} roughness={.23}/>
    <Tube a={[x,railY-.26,-.32]} b={[x,railY+.02,0]} radius={.018} color="#b7b6ad"/>
   </group>)}
  <Tube a={[-2.07,railY,0]} b={[2.07,railY,0]} radius={.027} color="#d0d5d8"/>
  {facings.map((p,i)=>{
   const x=(i-(facings.length-1)/2)*.70;
   return <Selectable key={p.id+'-'+i} product={p} position={[x,railY,.03]} onProduct={onProduct}>
     <group scale={1.04}><RealGarment product={p}/></group>
   </Selectable>;
  })}
  {shoes.map((p,i)=>{
   const x=(i-(shoes.length-1)/2)*1.14;
   return <group key={p.id}>
     <Box position={[x,.53,.48]} scale={[1.22,.085,.75]} color="#d6cbbd"/>
     <Selectable product={p} position={[x,.83,.48]} onProduct={onProduct}>
       <group scale={1.55}><Garment product={p} hanger={false}/></group>
     </Selectable>
   </group>;
  })}
  {/* Floating boutique rail label; placed above the actual hanger hooks. */}
  <Box position={[0,2.73,-.44]} scale={[3.55,.54,.05]} color="#f6f3ed"/>
  <Sign title={['THE DAILY EDIT','STATEMENT PIECES','SOFT STRUCTURES','CITY ESSENTIALS'][rack-1]}
    sub="SELECT A GARMENT / EXPLORE THE LOOK" position={[0,2.73,-.401]}
    width={3.45} height={.48} color="#b59973"/>
 </group>;
}
const routes:Vec3[][]=[[[0,0,-8],[0,0,7],[-5.4,0,7],[-5.4,0,-8]],[[-10.8,0,-8],[-10.8,0,7],[-5.4,0,7],[-5.4,0,-8]],[[5.4,0,-8],[5.4,0,7],[10.8,0,7],[10.8,0,-8]],[[0,0,-8],[10.8,0,-8],[10.8,0,7],[0,0,7]]];
function Shopper({index,fashion}:{index:number;fashion:boolean}) {
 const group=useRef<THREE.Group>(null),point=useRef((index+1)%4),pause=useRef(0);const route=fashion?[[0,0,7],[0,0,-7],[10.5,0,-7],[10.5,0,8]].map(v=>v as Vec3):routes[index%4];const [moving,setMoving]=useState(true);const isMoving=useRef(true);
 useFrame(({clock},dt)=>{if(!group.current)return;const g=group.current;if(pause.current>0){pause.current-=dt;if(isMoving.current){isMoving.current=false;setMoving(false)}return}if(!isMoving.current){isMoving.current=true;setMoving(true)}const target=new THREE.Vector3(...route[point.current]);const direction=target.sub(g.position);if(direction.length()<.1){point.current=(point.current+1)%route.length;pause.current=2+(index%3);return}direction.normalize();g.position.addScaledVector(direction,Math.min(dt,.05)*(.48+index*.07));g.quaternion.slerp(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.atan2(direction.x,direction.z)),Math.min(1,dt*5));g.userData.phase=clock.elapsedTime});
 return <group ref={group} position={route[index%route.length]}><Avatar style={index%2?'girl':'guy'} moving={moving} shirt={['#9c7965','#7d8e75','#bda8a4','#345a78'][index%4]} skin={['#b77f60','#d2ad8a','#785340'][index%3]}/><group position={[.4,.55,0]}><Box scale={[.3,.4,.17]} color="#b59f7a"/><mesh position={[0,.25,0]}><torusGeometry args={[.075,.01,6,12,Math.PI]}/><meshStandardMaterial color="#b59f7a"/></mesh></group></group>;
}
function Employee({fashion,onAssistant}:{fashion:boolean;onAssistant:()=>void}) {
 return <group position={[fashion?-2.7:3.3,0,8.2]} onClick={e=>{e.stopPropagation();onAssistant()}}><Avatar style="girl" shirt="#009cdb" skin="#bd8365"/><Box position={[0,1.2,.215]} scale={[.32,.4,.025]} color="#344a67"/><Sign title="NOVA" sub="STORE GUIDE" position={[.11,1.43,.23]} width={.19} height={.11}/><WorldLabel position={[0,2.6,0]} title="NOVA " subtitle="STORE ASSISTANT · CLICK TO TALK" className="employee-label" onClick={onAssistant}/></group>;
}
function Architecture({fashion}:{fashion:boolean}) {
 return <><mesh rotation={[-Math.PI/2,0,0]} position={[0,.012,0]} onClick={e=>{if(e.delta>5||e.button!==0)return;e.stopPropagation();window.dispatchEvent(new CustomEvent('nexaisle-walk',{detail:{x:e.point.x,z:e.point.z}}))}}><planeGeometry args={[25,26]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh><Box position={[0,-.13,0]} scale={[26,.25,27]} color={fashion?'#e7e2dc':'#191e29'} roughness={.3}/><Grid position={[0,.003,0]} args={[25,26]} cellSize={fashion?2:1} cellThickness={.55} cellColor={fashion?'#c9c4bd':'#34445c'} sectionSize={5} sectionThickness={.5} sectionColor="#009cdb" fadeDistance={40}/><Box position={[0,2.8,-12.5]} scale={[26,5.6,.22]} color={fashion?'#f6f5f2':'#1c2433'}/>{[-12.7,12.7].map(x=><group key={x}><Box position={[x,2.7,-1]} scale={[.2,5.4,24]} color={fashion?'#e6e0d9':'#1a2230'}/><Box position={[x*.99,3.7,-1]} scale={[.04,.15,24]} color={fashion?'#c2a272':'#009cdb'}/></group>)}<Sign position={[0,3.8,-12.34]} title={fashion?'NEXAISLE / ATELIER':'NEXAISLE / FRESH MARKET'} sub={fashion?'A NEW PERSPECTIVE ON PERSONAL STYLE':'GOOD INGREDIENTS. NEW POSSIBILITIES.'} width={8} height={1.65} dark color={fashion?'#b99b69':'#9eb0bd'}/>{[-9,-3,3,9].map(x=><group key={x}><Box position={[x,5,-1]} scale={[.1,.1,24]} color="#aaaeb1"/>{[-8,0,8].map(z=><group key={z}><Box position={[x,4.9,z]} scale={[3.6,.07,.35]} color="#f9f8e8"/><mesh position={[x,4.84,z]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[3.4,.3]}/><meshStandardMaterial color="#fff8dd" emissive="#fff8dd" emissiveIntensity={2}/></mesh></group>)}</group>)}{[-11,11].map(x=><group key={x} position={[x,0,-10.9]}><Box position={[0,.4,0]} scale={[.7,.8,.7]} color="#afa796"/>{[-.12,.08,.22].map((a,i)=><mesh key={i} position={[a,1+i*.2,0]} scale={[.28,.6,.18]} rotation={[.2,a,Math.PI/7*i]}><sphereGeometry args={[1,10,10]}/><meshStandardMaterial color="#4f7544"/></mesh>)}</group>)}
 <Box position={[0,.55,-10.5]} scale={[7,1.1,1.25]} color={fashion?'#d2c3b2':'#26334b'}/><Box position={[0,1.13,-10.5]} scale={[7.2,.12,1.4]} color={fashion?'#f1e8da':'#009cdb'}/><Sign title={fashion?'THE STYLE DESK':'CHECKOUT / DEMO'} sub="YOUR BAG IS SAVED BETWEEN WORLDS" position={[0,.65,-9.86]} width={3.6} height={.65} dark/>{[-2,2].map(x=><group key={x}><Box position={[x,1.36,-10.4]} scale={[.7,.42,.07]} color="#1a2325"/><Sign title="NX" sub="DEMO" position={[x,1.36,-10.35]} width={.65} height={.35}/></group>)}
 {fashion&&<><mesh position={[0,1.8,-12.3]}><planeGeometry args={[3,3]}/><meshStandardMaterial color="#c7d8df" metalness={.93} roughness={.16}/></mesh><Sign title="FITTING SUITE" sub="GARMENT FIT SIMULATION NOT INCLUDED" position={[0,3.5,-12.2]} width={3} height={.5}/></>}
 </>;
}
function Shop({fashion,onProduct,onAssistant,view,focusAisle,navigationKey,paused}:{fashion:boolean;onProduct:(p:Product)=>void;onAssistant:()=>void;view:View;focusAisle?:number|null;navigationKey?:number;paused?:boolean}) {
 return <><Architecture fashion={fashion}/>{fashion?Array.from({length:4},(_,i)=><ClothingRack key={i} rack={i+1} onProduct={onProduct}/>):Array.from({length:8},(_,i)=><Shelf key={i} aisle={i+1} onProduct={onProduct} active={focusAisle===i+1}/>)}{Array.from({length:4},(_,i)=><Shopper key={i} index={i} fashion={fashion}/>)}<Employee fashion={fashion} onAssistant={onAssistant}/><Player fashion={fashion} view={view} focusAisle={focusAisle} navigationKey={navigationKey} paused={paused}/></>;
}
export function ProductViewer({product}:{product:Product}) {
 if(product.level==='fashion'){const piece=findPiece(product.id);return piece?<FashionProductViewer piece={piece}/>:<div className="fashion-photo-unavailable">Photography for this archived piece is not available yet.</div>}
 return <div className="inspection-canvas"><Canvas shadows dpr={[1.5,2]} camera={{position:[0,.25,3.3],fov:36}}><color attach="background" args={['#151b27']}/><ambientLight intensity={1.8}/><directionalLight position={[3,5,4]} intensity={3} castShadow/><directionalLight position={[-3,2,-1]} intensity={2}/><group position={[0,-.25,0]}><group scale={1.6}><GroceryModel product={product}/></group></group><ContactShadows position={[0,-1.02,0]} scale={6} opacity={.3} blur={2}/><OrbitControls makeDefault target={[0,0,0]} minDistance={1.3} maxDistance={5} enablePan={false}/></Canvas><span>GENUINE 3D VIEW · DRAG TO ROTATE · SCROLL TO ZOOM</span></div>;
}
export default function Scene({mode,onProduct,onAssistant,focusAisle,navigationKey,paused}:Props) {
 const home=mode==='home',studio=home||mode==='avatar',fashionScene=mode==='fashion';const [view,setView]=useState<View>('walk');useEffect(()=>{if(focusAisle)setView(v=>v==='first'?'first':'walk')},[focusAisle,navigationKey]);
 return <div className="scene-container"><Canvas shadows camera={{position:home?[4,2.8,6]:studio?[3,2.4,5]:[0,3.7,14.3],fov:studio?35:52}} dpr={fashionScene?[1,1.35]:[1.5,2]} gl={{antialias:true,powerPreference:"default"}}><color attach="background" args={[studio?'#101117':fashionScene?'#101117':'#101117']}/><fog attach="fog" args={[studio?'#101117':fashionScene?'#101117':'#101117',studio?15:32,studio?45:72]}/><ambientLight intensity={studio?1.3:fashionScene?1.6:1.65}/><hemisphereLight args={['#fffbed','#8d9b91',fashionScene?1.1:1.0]}/><directionalLight position={[5,12,8]} intensity={fashionScene?2.15:1.9} castShadow shadow-mapSize={[fashionScene?1024:2048,fashionScene?1024:2048]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16} shadow-bias={-.001}/>{studio&&<pointLight position={[-4,3,-2]} color="#ff3d9a" intensity={35}/>}<Suspense fallback={null}>{studio?<><group position={[home?-.45:0,0,0]} rotation={[0,-.25,0]}><Avatar/>{home&&<Trolley/>}</group>{home&&<Float speed={1.2} rotationIntensity={.1} floatIntensity={.2}><mesh position={[0,1.5,-1.3]} rotation={[.2,.3,.7]}><torusGeometry args={[1.8,.42,24,80]}/><meshStandardMaterial color="#009cdb" metalness={.55} roughness={.23}/></mesh></Float>}<ContactShadows position={[0,-.02,0]} opacity={.65} scale={12} blur={2.5} far={5}/><Grid position={[0,-.035,0]} args={[30,30]} cellColor="#29344a" sectionColor="#009cdb" fadeDistance={12}/><OrbitControls target={[0,1,0]} minDistance={4} maxDistance={9} maxPolarAngle={Math.PI/2.05} enablePan={false}/></>:<Shop fashion={mode==='fashion'} onProduct={onProduct!} onAssistant={onAssistant||(()=>{})} view={view} focusAisle={focusAisle} navigationKey={navigationKey} paused={paused}/>}</Suspense></Canvas>{!studio&&<><div className="camera-panel"><span className="camera-panel-label">CAMERA <small>Right-drag to look · click floor to walk</small></span><div className="view-switch" role="group" aria-label="Camera angle">{cameraViews.map(option=><button key={option.id} aria-pressed={view===option.id} onClick={()=>setView(option.id)}>{option.label}</button>)}</div></div><div className="movement-help">Click floor to walk · WASD / arrows · Esc to stop{view==='first'&&<b>First person · hold right mouse button to look</b>}</div><div className="touch-controls" aria-label="Movement controls">{[['w','↑'],['a','←'],['s','↓'],['d','→']].map(([key,label])=><button key={key} aria-label={'Move '+({w:'forward',a:'left',s:'backward',d:'right'}[key])} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);dispatchMove(key,true)}} onPointerUp={()=>dispatchMove(key,false)} onLostPointerCapture={()=>dispatchMove(key,false)} onPointerCancel={()=>dispatchMove(key,false)}>{label}</button>)}</div></>}</div>;
}
