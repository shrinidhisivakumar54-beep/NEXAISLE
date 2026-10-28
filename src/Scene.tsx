import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Float, Grid } from '@react-three/drei';
import { Suspense, useEffect, useRef, useState } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { products, type Product } from './store';
import { Avatar, Trolley, Box, Tube, Sign, Garment, GroceryModel, PriceTag, type Vec3 } from './world/Models';
import { aisleNames, aislePosition, rackPosition, isBlocked } from './world/layout';
import { RealGarment } from './world/RealGarment';
export { Avatar } from './world/Models';
type View = 'walk'|'overview';
type Props = {mode:string;onProduct?:(p:Product)=>void;onAssistant?:()=>void;focusAisle?:number|null;navigationKey?:number;paused?:boolean};
const dispatchMove=(key:string,down:boolean)=>window.dispatchEvent(new CustomEvent('nexaisle-move',{detail:{key,down}}));
function Player({fashion,view,focusAisle,navigationKey,paused}:{fashion:boolean;view:View;focusAisle?:number|null;navigationKey?:number;paused?:boolean}) {
 const group=useRef<THREE.Group>(null),controls=useRef<OrbitControlsImpl>(null);const keys=useRef(new Set<string>()),heading=useRef(Math.PI),offset=useRef(new THREE.Vector3(0,2.6,4.8));const {camera,gl}=useThree();const [moving,setMoving]=useState(false);const wasMoving=useRef(false);
 useEffect(()=>{const down=(e:KeyboardEvent)=>{if((e.target as HTMLElement).closest('input,textarea,select,[role="dialog"]'))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();keys.current.add(e.key.toLowerCase())};const up=(e:KeyboardEvent)=>keys.current.delete(e.key.toLowerCase());const clear=()=>keys.current.clear();const touch=(e:Event)=>{const {key,down}=(e as CustomEvent).detail;if(down)keys.current.add(key);else keys.current.delete(key)};window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);window.addEventListener('nexaisle-move',touch);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);window.removeEventListener('nexaisle-move',touch)}},[]);
 useEffect(()=>{keys.current.clear();if(!group.current||!controls.current)return;const p=group.current.position;const target=new THREE.Vector3(p.x,p.y+1.1,p.z);if(view==='walk'){camera.position.copy(target).add(offset.current);controls.current.target.copy(target)}else{camera.position.set(17,22,23);controls.current.target.set(0,0,0)}controls.current.update()},[view,camera]);
 useEffect(()=>{if(!focusAisle||!group.current||!controls.current)return;const [x,,z]=fashion?rackPosition(focusAisle):aislePosition(focusAisle);group.current.position.set(x,0,z+2.3);group.current.rotation.y=Math.PI;heading.current=Math.PI;const target=new THREE.Vector3(x,1.1,z+2.3);camera.position.copy(target).add(new THREE.Vector3(0,2.1,4.5));controls.current.target.copy(target);controls.current.update()},[focusAisle,navigationKey,fashion,camera]);
 useFrame((_,dt)=>{if(!group.current||!controls.current)return;const g=group.current;let x=0,z=0;const k=keys.current;if(!paused){if(k.has('w')||k.has('arrowup'))z-=1;if(k.has('s')||k.has('arrowdown'))z+=1;if(k.has('a')||k.has('arrowleft'))x-=1;if(k.has('d')||k.has('arrowright'))x+=1}const isMoving=!!(x||z);if(wasMoving.current!==isMoving){setMoving(isMoving);wasMoving.current=isMoving}const delta=new THREE.Vector3();if(isMoving){const cameraAngle=Math.atan2(camera.position.x-controls.current.target.x,camera.position.z-controls.current.target.z);const v=new THREE.Vector3(x,0,z).normalize().applyAxisAngle(new THREE.Vector3(0,1,0),view==='walk'?cameraAngle:0).multiplyScalar(Math.min(dt,.05)*2.5);const before=g.position.clone();const collision=(px:number,pz:number)=>isBlocked(px,pz,fashion,.5)||(!fashion&&isBlocked(px+Math.sin(heading.current)*.95,pz+Math.cos(heading.current)*.95,false,.38));if(!collision(g.position.x+v.x,g.position.z))g.position.x+=v.x;if(!collision(g.position.x,g.position.z+v.z))g.position.z+=v.z;heading.current=Math.atan2(v.x,v.z);g.quaternion.slerp(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),heading.current),1-Math.exp(-dt*10));delta.copy(g.position).sub(before)}if(view==='walk'){const target=new THREE.Vector3(g.position.x,1.1,g.position.z);const shift=target.sub(controls.current.target);camera.position.add(shift);controls.current.target.add(shift);offset.current.copy(camera.position).sub(controls.current.target)}
 gl.domElement.dataset.playerX=g.position.x.toFixed(2);gl.domElement.dataset.playerZ=g.position.z.toFixed(2);
 });
 return <><group ref={group} position={[0,0,9.5]} rotation={[0,Math.PI,0]}><Avatar moving={moving} pushing={!fashion}/>{!fashion&&<Trolley moving={moving}/>}</group><OrbitControls ref={controls} makeDefault target={[0,1.1,9.5]} minDistance={view==='walk'?2.3:8} maxDistance={view==='walk'?8:39} maxPolarAngle={Math.PI/2.05} minPolarAngle={view==='walk'?.38:0} enablePan={view==='overview'} enabled={!paused}/></>;
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
 return <group position={aislePosition(aisle)}><Box position={[0,1.62,0]} scale={[3.9,3.23,.09]} color="#172b39"/>{[-1.95,1.95].map(x=><Box key={x} position={[x,1.62,0]} scale={[.065,3.2,1.28]} color={active?'#c7ff32':'#2155ff'} metal={.35}/>)}{tiers.map(y=><group key={y}><Box position={[0,y,0]} scale={[3.98,.075,1.35]} color="#243b4a" metal={.35}/>{[-1,1].map(s=><Box key={s} position={[0,y-.025,s*.68]} scale={[4,.11,.035]} color={active?'#c7ff32':'#2155b2'}/>)}</group>)}
 {Array.from({length:8},(_,i)=>{const p=items[i%items.length];const y=tiers[Math.floor(i/2)]+.06,x=(i%2)*1.85-.92;return <group key={i}>{[-1,1].map(side=><group key={side}>{[-.30,.30].map(copy=><Selectable key={copy} product={p} position={[x+copy,y,side*.38]} rotation={side<0?Math.PI:0} onProduct={onProduct}><group scale={1.23}><GroceryModel product={p}/></group></Selectable>)}<group rotation={[0,side<0?Math.PI:0,0]} position={[x,y-.12,side*.71]}><PriceTag product={p} position={[0,0,0]}/></group></group>)}</group>})}
 <Box position={[0,3.55,0]} scale={[3.4,.66,.1]} color="#0c1c28"/>{[-1,1].map(s=><Sign key={s} position={[0,3.55,s*.061]} title={String(aisle).padStart(2,'0')+' / '+aisleNames[aisle-1]} sub={active?'YOUR SELECTED AISLE':'FRESH FINDS / EVERYDAY GOOD'} width={3.3} height={.6} dark color={active?'#c7ff32':'#7fa087'} rotation={s<0?Math.PI:0}/>)}
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
 return <group ref={group} position={route[index%route.length]}><Avatar moving={moving} shirt={['#9c7965','#7d8e75','#bda8a4','#345a78'][index%4]} skin={['#b77f60','#d2ad8a','#785340'][index%3]}/><group position={[.4,.55,0]}><Box scale={[.3,.4,.17]} color="#b59f7a"/><mesh position={[0,.25,0]}><torusGeometry args={[.075,.01,6,12,Math.PI]}/><meshStandardMaterial color="#b59f7a"/></mesh></group></group>;
}
function Employee({fashion,onAssistant}:{fashion:boolean;onAssistant:()=>void}) {
 return <group position={[fashion?-2.7:3.3,0,8.2]} onClick={e=>{e.stopPropagation();onAssistant()}}><Avatar shirt="#2155ff" skin="#bd8365"/><Box position={[0,1.2,.215]} scale={[.32,.4,.025]} color="#173d80"/><Sign title="NOVA" sub="STORE GUIDE" position={[.11,1.43,.23]} width={.19} height={.11}/><WorldLabel position={[0,2.6,0]} title="NOVA " subtitle="STORE ASSISTANT · CLICK TO TALK" className="employee-label" onClick={onAssistant}/></group>;
}
function Architecture({fashion}:{fashion:boolean}) {
 return <><Box position={[0,-.13,0]} scale={[26,.25,27]} color={fashion?'#e7e2dc':'#243745'} roughness={.3}/><Grid position={[0,.003,0]} args={[25,26]} cellSize={fashion?2:1} cellThickness={.55} cellColor={fashion?'#c9c4bd':'#304657'} sectionSize={5} sectionThickness={.5} sectionColor="#516271" fadeDistance={40}/><Box position={[0,2.8,-12.5]} scale={[26,5.6,.22]} color={fashion?'#f6f5f2':'#182532'}/>{[-12.7,12.7].map(x=><group key={x}><Box position={[x,2.7,-1]} scale={[.2,5.4,24]} color={fashion?'#e6e0d9':'#192837'}/><Box position={[x*.99,3.7,-1]} scale={[.04,.15,24]} color={fashion?'#c2a272':'#2155ff'}/></group>)}<Sign position={[0,3.8,-12.34]} title={fashion?'NEXAISLE / ATELIER':'NEXAISLE / FRESH MARKET'} sub={fashion?'A NEW PERSPECTIVE ON PERSONAL STYLE':'GOOD INGREDIENTS. NEW POSSIBILITIES.'} width={8} height={1.65} dark color={fashion?'#b99b69':'#c7ff32'}/>{[-9,-3,3,9].map(x=><group key={x}><Box position={[x,5,-1]} scale={[.1,.1,24]} color="#aaaeb1"/>{[-8,0,8].map(z=><group key={z}><Box position={[x,4.9,z]} scale={[3.6,.07,.35]} color="#f9f8e8"/><mesh position={[x,4.84,z]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[3.4,.3]}/><meshStandardMaterial color="#fff8dd" emissive="#fff8dd" emissiveIntensity={2}/></mesh></group>)}</group>)}{[-11,11].map(x=><group key={x} position={[x,0,-10.9]}><Box position={[0,.4,0]} scale={[.7,.8,.7]} color="#afa796"/>{[-.12,.08,.22].map((a,i)=><mesh key={i} position={[a,1+i*.2,0]} scale={[.28,.6,.18]} rotation={[.2,a,Math.PI/7*i]}><sphereGeometry args={[1,10,10]}/><meshStandardMaterial color="#4f7544"/></mesh>)}</group>)}
 <Box position={[0,.55,-10.5]} scale={[7,1.1,1.25]} color={fashion?'#d2c3b2':'#192d3a'}/><Box position={[0,1.13,-10.5]} scale={[7.2,.12,1.4]} color={fashion?'#f1e8da':'#33485a'}/><Sign title={fashion?'THE STYLE DESK':'CHECKOUT / DEMO'} sub="YOUR BAG IS SAVED BETWEEN WORLDS" position={[0,.65,-9.86]} width={3.6} height={.65} dark/>{[-2,2].map(x=><group key={x}><Box position={[x,1.36,-10.4]} scale={[.7,.42,.07]} color="#1a2325"/><Sign title="NX" sub="DEMO" position={[x,1.36,-10.35]} width={.65} height={.35}/></group>)}
 {fashion&&<><mesh position={[0,1.8,-12.3]}><planeGeometry args={[3,3]}/><meshStandardMaterial color="#c7d8df" metalness={.93} roughness={.16}/></mesh><Sign title="FITTING SUITE" sub="GARMENT FIT SIMULATION NOT INCLUDED" position={[0,3.5,-12.2]} width={3} height={.5}/></>}
 </>;
}
function Shop({fashion,onProduct,onAssistant,view,focusAisle,navigationKey,paused}:{fashion:boolean;onProduct:(p:Product)=>void;onAssistant:()=>void;view:View;focusAisle?:number|null;navigationKey?:number;paused?:boolean}) {
 return <><Architecture fashion={fashion}/>{fashion?Array.from({length:4},(_,i)=><ClothingRack key={i} rack={i+1} onProduct={onProduct}/>):Array.from({length:8},(_,i)=><Shelf key={i} aisle={i+1} onProduct={onProduct} active={focusAisle===i+1}/>)}{Array.from({length:4},(_,i)=><Shopper key={i} index={i} fashion={fashion}/>)}<Employee fashion={fashion} onAssistant={onAssistant}/><Player fashion={fashion} view={view} focusAisle={focusAisle} navigationKey={navigationKey} paused={paused}/></>;
}
export function ProductViewer({product}:{product:Product}) {
 return <div className="inspection-canvas"><Canvas shadows dpr={[1.5,2]} camera={{position:[0,.25,3.3],fov:36}}><color attach="background" args={['#e6e2d9']}/><ambientLight intensity={1.8}/><directionalLight position={[3,5,4]} intensity={3} castShadow/><directionalLight position={[-3,2,-1]} intensity={2}/><group position={[0,product.level==='fashion'?.1:-.25,0]}>{product.level==='fashion'?<group position={[0,.35,0]}><RealGarment product={product}/></group>:<group scale={1.6}><GroceryModel product={product}/></group>}</group><ContactShadows position={[0,-1.02,0]} scale={6} opacity={.3} blur={2}/><OrbitControls makeDefault target={[0,0,0]} minDistance={1.3} maxDistance={5} enablePan={false}/></Canvas><span>GENUINE 3D VIEW · DRAG TO ROTATE · SCROLL TO ZOOM</span></div>;
}
export default function Scene({mode,onProduct,onAssistant,focusAisle,navigationKey,paused}:Props) {
 const home=mode==='home',studio=home||mode==='avatar',fashionScene=mode==='fashion';const [view,setView]=useState<View>('walk');useEffect(()=>{if(focusAisle)setView('walk')},[focusAisle,navigationKey]);
 return <div className="scene-container"><Canvas shadows camera={{position:home?[4,2.8,6]:studio?[3,2.4,5]:[0,3.7,14.3],fov:studio?35:52}} dpr={fashionScene?[1,1.35]:[1.5,2]} gl={{antialias:true,powerPreference:"default"}}><color attach="background" args={[studio?'#090e1c':fashionScene?'#f4f1eb':'#1d2d3d']}/><fog attach="fog" args={[studio?'#090e1c':fashionScene?'#f4f1eb':'#1d2d3d',studio?15:32,studio?45:72]}/><ambientLight intensity={studio?1.3:fashionScene?1.6:1.1}/><hemisphereLight args={['#fffbed','#8d9b91',fashionScene?1.1:.8]}/><directionalLight position={[5,12,8]} intensity={fashionScene?2.15:1.9} castShadow shadow-mapSize={[fashionScene?1024:2048,fashionScene?1024:2048]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16} shadow-bias={-.001}/>{studio&&<pointLight position={[-4,3,-2]} color="#2155ff" intensity={35}/>}<Suspense fallback={null}>{studio?<><group position={[home?-.45:0,0,0]} rotation={[0,-.25,0]}><Avatar/>{home&&<Trolley/>}</group>{home&&<Float speed={1.2} rotationIntensity={.1} floatIntensity={.2}><mesh position={[0,1.5,-1.3]} rotation={[.2,.3,.7]}><torusGeometry args={[1.8,.42,24,80]}/><meshStandardMaterial color="#1644ff" metalness={.55} roughness={.23}/></mesh></Float>}<ContactShadows position={[0,-.02,0]} opacity={.65} scale={12} blur={2.5} far={5}/><Grid position={[0,-.035,0]} args={[30,30]} cellColor="#1b2d4c" sectionColor="#253559" fadeDistance={12}/><OrbitControls target={[0,1,0]} minDistance={4} maxDistance={9} maxPolarAngle={Math.PI/2.05} enablePan={false}/></>:<Shop fashion={mode==='fashion'} onProduct={onProduct!} onAssistant={onAssistant||(()=>{})} view={view} focusAisle={focusAisle} navigationKey={navigationKey} paused={paused}/>}</Suspense></Canvas>{!studio&&<><div className="view-switch" aria-label="Camera mode"><button aria-pressed={view==='walk'} onClick={()=>setView('walk')}>WALK THROUGH</button><button aria-pressed={view==='overview'} onClick={()=>setView('overview')}>STORE OVERVIEW</button></div><div className="touch-controls" aria-label="Movement controls">{[['w','↑'],['a','←'],['s','↓'],['d','→']].map(([key,label])=><button key={key} aria-label={'Move '+({w:'forward',a:'left',s:'backward',d:'right'}[key])} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);dispatchMove(key,true)}} onPointerUp={()=>dispatchMove(key,false)} onLostPointerCapture={()=>dispatchMove(key,false)} onPointerCancel={()=>dispatchMove(key,false)}>{label}</button>)}</div></>}</div>;
}
