import {useState,lazy,Suspense} from 'react';
import LightingShowroom from './LightingShowroom';
const MattressShowroom=lazy(()=>import('./MattressShowroom'));
export default function FurnitureWorld(){const [tab,setTab]=useState('lighting');return <><nav className="furniture-sections" aria-label="Furniture categories"><button aria-pressed={tab==='lighting'} onClick={()=>setTab('lighting')}>Lighting</button><button aria-pressed={tab==='mattresses'} onClick={()=>setTab('mattresses')}>Mattresses</button></nav>{tab==='lighting'?<LightingShowroom/>:<Suspense fallback={<div className="world-loading">Preparing the mattress studio…</div>}><MattressShowroom/></Suspense>}</>}
