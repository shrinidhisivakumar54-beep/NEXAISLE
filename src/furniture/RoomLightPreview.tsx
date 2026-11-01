import {useState,type CSSProperties} from 'react';
import {Power,Sun,Moon} from 'lucide-react';
export type RoomLightControls={on:boolean;night:boolean;tone:'warm'|'white';strength:number;setOn:(value:boolean)=>void;setNight:(value:boolean)=>void};
export default function RoomLightPreview({image,original,name,split,setSplit,position,light}:{image:string;original?:string;name:string;split:number;setSplit:(value:number)=>void;position?:{x:number;y:number};light:RoomLightControls}){
 const [ratio,setRatio]=useState(1);
 const x=position?.x??50,y=position?.y??35;
 const style={'--room-light-x':`${x}%`,'--room-light-y':`${y}%`,'--room-light-colour':light.tone==='warm'?'255,190,108':'210,235,255','--room-light-strength':light.strength/100,aspectRatio:String(ratio)} as CSSProperties;
 return <>
  <div className="room-result-controls" aria-label="Generated room lighting">
   <div role="group" aria-label="Lamp power"><button aria-pressed={light.on} onClick={()=>light.setOn(true)}><Power size={15}/>ON</button><button aria-pressed={!light.on} onClick={()=>light.setOn(false)}><Power size={15}/>OFF</button></div>
   <div role="group" aria-label="Time of day"><button aria-pressed={!light.night} onClick={()=>light.setNight(false)}><Sun size={15}/>Day</button><button aria-pressed={light.night} onClick={()=>light.setNight(true)}><Moon size={15}/>Night</button></div>
   <span role="status">Lamp {light.on?'ON':'OFF'} · {light.night?'Night':'Day'}</span>
  </div>
  <div className={`room-comparison room-light-result ${light.on?'is-powered':'is-off'} ${light.night?'is-night':'is-day'}`} style={style}>
   <img className="room-generated-image" src={image} alt={`AI room after placing ${name}, lamp ${light.on?'on':'off'}`} onLoad={e=>{const im=e.currentTarget;if(im.naturalWidth&&im.naturalHeight)setRatio(im.naturalWidth/im.naturalHeight)}}/>
   <img className="room-generated-lit" src={image} alt="" aria-hidden="true"/>
   <span className="room-result-glow"/><span className="room-result-spill"/>
   {original&&<><img className="room-original-image" src={original} alt="Original room before lighting placement" style={{clipPath:`inset(0 ${100-split}% 0 0)`}}/><span className="room-before">Original Room — Before</span><span className="room-after">AI Room — After · {light.on?'ON':'OFF'}</span><span className="room-divider" style={{left:`${split}%`}}/><input aria-label="Before and after comparison" type="range" min="0" max="100" value={split} onChange={e=>setSplit(Number(e.target.value))}/></>}
  </div>
  <p className="room-hint">ON/OFF changes the lighting preview instantly. Drag the comparison slider to reveal your original room. Light effects are illustrative.</p>
 </>;
}
