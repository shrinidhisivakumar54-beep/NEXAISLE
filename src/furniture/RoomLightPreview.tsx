import {useState} from 'react';
import {Power,Sun,Moon} from 'lucide-react';
import RelitPhoto from './RelitPhoto';
import {fixtureSources} from './relighting';
export type RoomLightControls={on:boolean;night:boolean;tone:'warm'|'white';strength:number;setOn:(value:boolean)=>void;setNight:(value:boolean)=>void;setStrength:(value:number)=>void};
export default function RoomLightPreview({image,original,name,category,split,setSplit,position,light}:{image:string;original?:string;name:string;category:string;split:number;setSplit:(value:number)=>void;position?:{x:number;y:number};light:RoomLightControls}){
 const [ratio,setRatio]=useState(1);
 return <>
  <div className="room-result-controls" aria-label="Generated room lighting">
   <div role="group" aria-label="Lamp power"><button aria-pressed={light.on} onClick={()=>{if(light.strength===0)light.setStrength(75);light.setOn(true)}}><Power size={15}/>ON</button><button aria-pressed={!light.on} onClick={()=>light.setOn(false)}><Power size={15}/>OFF</button></div>
   <div role="group" aria-label="Time of day"><button aria-pressed={!light.night} onClick={()=>light.setNight(false)}><Sun size={15}/>Day</button><button aria-pressed={light.night} onClick={()=>light.setNight(true)}><Moon size={15}/>Night</button></div>
   <span role="status">Lamp {light.on?'ON':'OFF'} · {light.night?'Night':'Day'}</span>
   <label className="room-modal-intensity">Brightness<input aria-label="Room light brightness" type="range" min="0" max="100" step="1" value={light.strength} onChange={e=>{const value=Number(e.target.value);light.setStrength(value);light.setOn(value>0)}}/><b>{light.strength}%</b></label>
  </div>
  <div className={`room-comparison room-light-result ${light.on?'is-powered':'is-off'} ${light.night?'is-night':'is-day'}`} style={{aspectRatio:String(ratio)}}>
   <RelitPhoto src={image} alt={`AI room after placing ${name}, lamp ${light.on?'on':'off'}`} on={light.on} night={light.night} tone={light.tone} strength={light.strength} sources={fixtureSources(category,position)} kind={category==='Chandeliers'?'chandelier':category==='Bulbs'?'bulb':'shade'} onLoad={(width,height)=>setRatio(width/height)}/>
   {original&&<><img className="room-original-image" src={original} alt="Original room before lighting placement" style={{clipPath:`inset(0 ${100-split}% 0 0)`}}/><span className="room-before">Original Room — Before</span><span className="room-after">AI Room — After · {light.on?'ON':'OFF'}</span><span className="room-divider" style={{left:`${split}%`}}/><input aria-label="Before and after comparison" type="range" min="0" max="100" value={split} onChange={e=>setSplit(Number(e.target.value))}/></>}
  </div>
  <p className="room-hint">ON/OFF changes the lighting preview instantly. Drag the comparison slider to reveal your original room. Brightness is a photographic estimate, not a calibrated lighting calculation.</p>
 </>;
}
