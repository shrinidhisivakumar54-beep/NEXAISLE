import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import {splitMesh} from './splitWatchGeometry';
import {watchParts,type WatchDesign,type WatchPart,type PartId} from './watchCollection';
const fit=3.1/.24604342877864838,origin=new THREE.Vector3(-.0011029504,.1230217144,-.0161556564);
const rows:[PartId,string,string,number[],number[]][]=[
 ['crystal','Sapphire glass','The separate glass surface supplied with this asset. Optical material is preserved.',[-.00544,.1674,.0571],[0,.09,.1559]],
 ['bezel','Bezel','The existing outer bezel geometry extracted from the supplied mesh.',[-.00544,.1640,.0521],[0,.0625,.1083]],
 ['second','Seconds hand','The existing thin hand geometry; no new hand was created.',[.0102,.1719,.0506],[0,.0475,.0823]],
 ['minute','Minute hand','The existing long hand, separated without changing its shape.',[-.023,.1654,.0536],[0,.0375,.065]],
 ['hour','Hour hand','The existing shorter hand, separated without changing its shape.',[-.0117,.1584,.0567],[0,.0275,.0476]],
 ['dial','Dial and hour markers','The original dial surface and its applied markers retain their original textures.',[-.00544,.1636,.0505],[0,.0125,.0217]],
 ['date','Date display surface','This is the existing textured date display surface, not a modelled date mechanism.',[.0259,.1631,.0499],[0,.0025,.0043]],
 ['case','Watch case','The existing main case. No internal movement geometry is present.',[-.00544,.1577,.0403],[0,-.02,-.0346]],
 ['crown','Crown assembly','The original crown and end detail move sideways together.',[.059,.159,.0426],[.10,-.02,-.0346]],
 ['back','Case back','The separate rear cover geometry extracted from this file.',[-.00544,.1566,.0372],[0,-.06,-.1039]],
 ['strap','Bracelet and clasp','The original bracelet links and clasp remain a single selectable assembly.',[-.00544,.123,-.04],[-.16,-.035,-.0606]],
];
export const prxParts:WatchPart[]=rows.map(([id,name,description,c,o])=>({id,name,function:description,z:(c[2]-origin.z)*fit,explode:o[2]*fit,x:(c[0]-origin.x+o[0])*fit,y:(c[1]-origin.y+o[1])*fit}));
export function partsForWatch(w:WatchDesign){return w.id==='nxw0'&&'modelUrl'in w&&w.modelUrl?prxParts:watchParts(w)}
function keyFor(index:number,glass:boolean):PartId {if(glass)return 'crystal';if(index<=12||index>=18&&index<=38)return 'strap';if(index===13)return 'bezel';if(index===14||index===15)return 'crown';if(index===16)return 'case';if(index===17)return 'back';if(index===40)return 'date';if(index===42)return 'second';if(index===43)return 'minute';if(index===44)return 'hour';return 'dial'}
export default function PrxAssembly({url,amount,part,onPart}:{url:string;amount:number;part:PartId|null;onPart:(id:PartId)=>void}){
 const {scene}=useGLTF(url),groups=useRef<Partial<Record<PartId,THREE.Group>>>({});
 const assembly=useMemo(()=>{const pieces:{id:PartId;geometry:THREE.BufferGeometry;material:THREE.Material|THREE.Material[];matrix:THREE.Matrix4}[]=[];scene.updateMatrixWorld(true);scene.traverse(n=>{if(!(n instanceof THREE.Mesh))return;const m=Array.isArray(n.material)?n.material[0]:n.material,glass=m.name==='Zaffiro';splitMesh(n).forEach((geometry,index)=>pieces.push({id:keyFor(index,glass),geometry,material:Array.isArray(n.material)?n.material.map(m=>m.clone()):n.material.clone(),matrix:n.matrixWorld.clone()}))});return pieces},[scene]);
 useEffect(()=>()=>{assembly.forEach(p=>{p.geometry.dispose();(Array.isArray(p.material)?p.material:[p.material]).forEach(m=>m.dispose())})},[assembly]);
 useFrame((_,dt)=>{rows.forEach(([id,,,__,o])=>{const g=groups.current[id];if(g)g.position.lerp(new THREE.Vector3(o[0],o[1],o[2]).multiplyScalar(amount),1-Math.exp(-Math.min(dt,.05)*6))});assembly.forEach(p=>(Array.isArray(p.material)?p.material:[p.material]).forEach(m=>{if(m instanceof THREE.MeshStandardMaterial){m.emissive.set(p.id===part?'#00687c':'#000');m.emissiveIntensity=p.id===part?.4:0}}))});
 return <group scale={fit}><group position={[-origin.x,-origin.y,-origin.z]}>{rows.map(([id])=><group key={id} name={id} ref={node=>{if(node)groups.current[id]=node}} onClick={e=>{e.stopPropagation();if(e.delta<4)onPart(id)}}>{assembly.filter(p=>p.id===id).map((p,i)=><mesh key={i} geometry={p.geometry} material={p.material} matrix={p.matrix} matrixAutoUpdate={false} castShadow/>)}</group>)}</group></group>
}
