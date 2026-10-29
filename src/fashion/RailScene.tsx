import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, ContactShadows, useTexture, OrbitControls } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { atlasUrl, type EditorialPiece } from './collection';

function ChromeTube({a,b,radius=.018}:{a:[number,number,number];b:[number,number,number];radius?:number}) {
  const start=new THREE.Vector3(...a), end=new THREE.Vector3(...b);
  const direction=end.clone().sub(start);
  return <mesh position={start.add(end).multiplyScalar(.5)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize())} castShadow>
    <cylinderGeometry args={[radius,radius,direction.length(),16]}/>
    <meshStandardMaterial color="#d1d2cf" metalness={1} roughness={.18}/>
  </mesh>;
}
function woodTexture() {
  const c=document.createElement('canvas');c.width=128;c.height=64;
  const ctx=c.getContext('2d')!;ctx.fillStyle='#b7834e';ctx.fillRect(0,0,128,64);
  for(let i=0;i<50;i++){ctx.strokeStyle=`rgba(83,43,18,${.04+(i%4)*.025})`;ctx.beginPath();ctx.moveTo(0,i*1.4);ctx.bezierCurveTo(40,i*1.4-2,80,i*1.4+2,128,i*1.4);ctx.stroke()}
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export function WoodenHanger({clip=false}:{clip?:boolean}) {
  const wood=useMemo(woodTexture,[]);
  const shoulder=useMemo(()=>{
    const s=new THREE.Shape();s.moveTo(-.32,-.395);s.quadraticCurveTo(-.35,-.36,-.30,-.34);s.lineTo(-.06,-.23);s.quadraticCurveTo(0,-.205,.06,-.23);s.lineTo(.30,-.34);s.quadraticCurveTo(.35,-.36,.32,-.395);s.lineTo(.26,-.385);s.lineTo(.03,-.285);s.quadraticCurveTo(0,-.275,-.03,-.285);s.lineTo(-.26,-.385);s.closePath();
    return new THREE.ExtrudeGeometry(s,{depth:.035,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.008,bevelThickness:.008});
  },[]);
  const hook=useMemo(()=>new THREE.CatmullRomCurve3([new THREE.Vector3(.056,-.035,0),new THREE.Vector3(.06,.035,0),new THREE.Vector3(.015,.068,0),new THREE.Vector3(-.045,.048,0),new THREE.Vector3(-.052,-.015,0),new THREE.Vector3(0,-.093,0),new THREE.Vector3(0,-.225,0)]),[]);
  useEffect(()=>()=>wood.dispose(),[wood]);
  return <group><mesh castShadow><tubeGeometry args={[hook,28,.008,8,false]}/><meshStandardMaterial color="#c7c9c6" roughness={.15} metalness={1}/></mesh><mesh geometry={shoulder} position={[0,0,-.018]} castShadow><meshStandardMaterial map={wood} roughness={.46}/></mesh><ChromeTube a={[-.29,-.39,0]} b={[.29,-.39,0]} radius={.006}/>{clip&&[-.22,.22].map(x=><mesh key={x} position={[x,-.41,.01]}><boxGeometry args={[.05,.07,.03]}/><meshStandardMaterial color="#b3b4af" metalness={1} roughness={.25}/></mesh>)}</group>;
}
export function PhotoGarment({piece,hanger=true}:{piece:EditorialPiece;hanger?:boolean}) {
  const source=useTexture(atlasUrl);
  const map=useMemo(()=>{const texture=source.clone();const [left,top,right,bottom]=piece.crop;texture.repeat.set((right-left)/1536,(bottom-top)/1024);texture.offset.set(left/1536,1-bottom/1024);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;return texture},[source,piece]);
  useEffect(()=>()=>map.dispose(),[map]);
  const height=piece.width*(piece.crop[3]-piece.crop[1])/(piece.crop[2]-piece.crop[0]);
  return <group>{hanger&&<WoodenHanger clip={piece.id==='f9'||piece.id==='f3'}/>}<mesh position={[0,-.265-height/2,.035]} castShadow>
    <planeGeometry args={[piece.width,height]}/><meshBasicMaterial map={map} transparent alphaTest={.18} side={THREE.DoubleSide} depthWrite={true}/>
  </mesh></group>;
}
function HangingPiece({piece,index,count,active}:{piece:EditorialPiece;index:number;count:number;active:boolean}) {
  const pivot=useRef<THREE.Group>(null);const {gl}=useThree();
  useFrame((_,dt)=>{if(!pivot.current)return;const ease=1-Math.exp(-dt*8);pivot.current.rotation.y=THREE.MathUtils.lerp(pivot.current.rotation.y,active?0:-.48,ease);pivot.current.rotation.x=THREE.MathUtils.lerp(pivot.current.rotation.x,active?-.12:0,ease);gl.domElement.dataset['garment'+piece.id]=(pivot.current.rotation.y).toFixed(3)});
  return <group position={[-(count-1)*.54+index*1.08,3.1,0]}><group ref={pivot} rotation={[0,-.48,0]}><PhotoGarment piece={piece}/></group></group>;
}
function CameraFit() {
  const {camera,size}=useThree();useEffect(()=>{const orthographic=camera as THREE.OrthographicCamera;orthographic.zoom=size.width/12.4;orthographic.position.set(0,2,12);orthographic.lookAt(0,2,0);orthographic.updateProjectionMatrix()},[camera,size]);return null;
}
function StudioLight() {
  return <><ambientLight intensity={1.2}/><directionalLight position={[-4,6,5]} intensity={2} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-bias={-.0001}/><Environment resolution={64}><Lightformer intensity={4} position={[0,5,3]} scale={[14,3,1]}/><Lightformer intensity={3} position={[-5,2,2]} rotation={[0,Math.PI/3,0]} scale={[2,7,1]}/><Lightformer intensity={1} color="#333a46" position={[5,1,3]} rotation={[0,-Math.PI/3,0]} scale={[3,6,1]}/></Environment></>;
}
export function RailScene({pieces,active}:{pieces:EditorialPiece[];active:string|null}) {
  return <Canvas orthographic camera={{position:[0,2,12],zoom:80,near:.1,far:50}} dpr={[1,1.75]} shadows gl={{alpha:true,antialias:true}} aria-label="Interactive clothing rail"><CameraFit/><StudioLight/><Suspense fallback={null}>
    <ChromeTube a={[-5.9,3.1,0]} b={[5.9,3.1,0]} radius={.022}/>
    {[-5.87,5.87].map(x=><group key={x}><ChromeTube a={[x,3.1,-.02]} b={[x,3.1,-.42]} radius={.022}/><ChromeTube a={[x,3.1,-.42]} b={[x,3.42,-.42]} radius={.022}/><mesh position={[x,3.45,-.42]}><boxGeometry args={[.14,.055,.22]}/><meshStandardMaterial color="#c4c5c2" metalness={1} roughness={.24}/></mesh></group>)}
    {pieces.map((piece,index)=><HangingPiece key={piece.id} piece={piece} index={index} count={pieces.length} active={active===piece.id}/>)}
    <mesh position={[0,2,-.42]} receiveShadow><planeGeometry args={[20,8]}/><shadowMaterial transparent opacity={.055}/></mesh>
    <ContactShadows position={[0,.15,0]} scale={15} opacity={.09} blur={3} far={4} resolution={256}/>
  </Suspense></Canvas>;
}
export function FashionProductViewer({piece}:{piece:EditorialPiece}) {
  return <div className="fashion-photo-viewer"><Canvas camera={{position:[0,1.9,3.3],fov:38}} dpr={[1,1.75]} shadows><color attach="background" args={['#151b27']}/><StudioLight/><Suspense fallback={null}><group position={[0,2.65,0]}><PhotoGarment piece={piece}/></group><ContactShadows position={[0,.3,0]} scale={6} blur={3} opacity={.2}/></Suspense><OrbitControls target={[0,1.75,0]} enablePan={false} minDistance={2} maxDistance={4.5} minAzimuthAngle={-.6} maxAzimuthAngle={.6} minPolarAngle={Math.PI*.35} maxPolarAngle={Math.PI*.65}/></Canvas><span>DRAG TO TILT · SCROLL TO ZOOM · FRONT IMAGERY</span></div>;
}
