import {useState,type CSSProperties} from 'react';
import {Sun,Moon,Power,ArrowUpRight,Check,Heart,Lightbulb,ChevronRight} from 'lucide-react';
import {lightingCollection,type LightingPiece} from './lightingCollection';
import './lighting.css';
import RoomPreview from './RoomPreview';
const categories=['All lighting','Chandeliers','Pendants','Table lamps','Bulbs'];
function PhotoPreview({piece,on,tone,night,strength,onToggle}:{piece:LightingPiece;on:boolean;tone:'warm'|'white';night:boolean;strength:number;onToggle:()=>void}){
 const [failed,setFailed]=useState(false);
 const mask=piece.sources.map(([x,y,r])=>`radial-gradient(circle at ${x}% ${y}%, black 0%, black ${r*.45}%, transparent ${r*2.7}%)`).join(',');
 const css={'--light-colour':tone==='warm'?'255,190,108':'210,235,255','--light-strength':strength/100,'--light-mask':mask} as CSSProperties;
 return <button className={`lighting-preview ${night?'is-night':'is-day'} ${on?'is-powered':'is-off'} tone-${tone}`} onClick={onToggle} aria-label={`${on?'Switch off':'Switch on'} ${piece.name}`} aria-pressed={on} style={css}>
  {failed?<div className="lighting-image-error"><Lightbulb size={36}/><b>Product image unavailable</b><span>Open the original product page below to view it.</span></div>:<><img key={piece.id} className="lighting-ambient-image" src={piece.room} alt={`${piece.name} — original IKEA product imagery`} onError={()=>setFailed(true)}/><img className="lighting-illuminated-image" src={piece.room} alt="" aria-hidden="true"/>{piece.sources.map(([x,y,r],i)=><span key={i} className="lighting-emitter" style={{left:x+'%',top:y+'%',width:r*2+'%',height:r*2+'%'}}/>)}<span className="lighting-room-spill"/></>}
  <span className="lighting-image-label"><span className="lighting-status-dot"/>{on?'LIGHT ON':'LIGHT OFF'}<span>{night?'DARK ROOM':'DAYLIGHT'}</span></span>
  <span className="lighting-image-action"><Power size={15}/>{on?'Click image to switch off':'Click image to switch on'}</span>
 </button>
}
export default function LightingShowroom(){
 const [space,setSpace]=useState(true);
 const [selected,setSelected]=useState(lightingCollection[0]),[category,setCategory]=useState('All lighting'),[on,setOn]=useState(false),[night,setNight]=useState(false),[tone,setTone]=useState<'warm'|'white'>('warm'),[strength,setStrength]=useState(75);
 const [saved,setSaved]=useState<string[]>(()=>{try{const value=JSON.parse(localStorage.getItem('nexaisle-lighting-saved')||'[]');return Array.isArray(value)?value.filter(x=>typeof x==='string'):[]}catch{return []}});
 const filtered=lightingCollection.filter(p=>category==='All lighting'||p.category===category);
 function choose(p:LightingPiece){setSelected(p);setOn(false);setTone(p.temperature===4000?'white':'warm');document.getElementById('lighting-studio')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}
 function save(){const next=saved.includes(selected.id)?saved.filter(id=>id!==selected.id):[...saved,selected.id];setSaved(next);try{localStorage.setItem('nexaisle-lighting-saved',JSON.stringify(next))}catch{}}
 return <section className="lighting-showroom" aria-label="Furniture lighting showroom">
  <div className="lighting-topline"><span>FURNITURE WORLD <ChevronRight size={12}/> THE LIGHTING EDIT</span><span>COLLECTION 003</span></div>
  <div className="lighting-intro"><div><span className="eyebrow">A DIFFERENT LIGHT ON EVERYDAY.</span><h1>Set the <em>mood.</em></h1><p>Real designs. A warmer welcome.<br/>Find the light that makes a room feel like you.</p></div><div className="lighting-intro-note"><Lightbulb size={22}/><span>Original images of real IKEA products.<br/><b>Click a light. See the atmosphere change.</b></span></div></div>
  <div className="lighting-studio" id="lighting-studio">
   <div className="lighting-stage-wrap">
    <div className="lighting-room-switch" role="group" aria-label="Room lighting"><button aria-pressed={!night} onClick={()=>setNight(false)}><Sun size={15}/>Day mode</button><button aria-pressed={night} onClick={()=>setNight(true)}><Moon size={15}/>Dark mode</button></div>
    <div className="space-view-toggle" role="group" aria-label="Product scene"><button aria-pressed={space} onClick={()=>setSpace(true)}>See It in Your Space</button><button aria-pressed={!space} onClick={()=>setSpace(false)}>Original product photograph</button></div>
    {space?<RoomPreview piece={selected} on={on} night={night} tone={tone} strength={strength} onToggle={()=>setOn(v=>!v)}/>:<PhotoPreview key={selected.id} piece={selected} on={on} tone={tone} night={night} strength={strength} onToggle={()=>setOn(v=>!v)}/>}
    <div className="lighting-photo-credit"><span>ORIGINAL MANUFACTURER IMAGERY · IKEA</span><a href={selected.source} target="_blank" rel="noreferrer">View source <ArrowUpRight size={12}/></a></div>
   </div>
   <div className="lighting-details"><span className="lighting-detail-kicker">{selected.category} / {String(lightingCollection.indexOf(selected)+1).padStart(2,'0')}</span><h2>{selected.name}</h2><p className="lighting-subtitle">{selected.subtitle}</p><p className="lighting-description">{selected.description}</p>
    <div className="lighting-material"><span>THE DETAILS</span><b>{selected.material}</b></div>
    <fieldset className="lighting-temperature"><legend>Choose your light</legend><div role="group" aria-label="Light colour"><button className="warm-option" aria-pressed={tone==='warm'} disabled={!!selected.temperature&&selected.temperature!==2700} onClick={()=>{setTone('warm');setOn(true)}}><i/><span>Warm yellow<small>2700 K · preview</small></span>{tone==='warm'&&<Check size={15}/>}</button><button className="white-option" aria-pressed={tone==='white'} disabled={!!selected.temperature&&selected.temperature!==4000} onClick={()=>{setTone('white');setOn(true)}}><i/><span>White light<small>4000 K · preview</small></span>{tone==='white'&&<Check size={15}/>}</button></div><p>{selected.temperature?`This bulb is rated ${selected.temperature} K. Choose the other bulb in the collection to compare colours.`:'Compare bulb colours in this fixture. Bulb compatibility and availability are listed on the original product page.'}</p></fieldset>
    <label className="lighting-strength"><span>Preview intensity <b>{strength}%</b></span><input type="range" min="25" max="100" step="5" value={strength} onChange={e=>setStrength(Number(e.target.value))}/><small>Changes the screen preview.</small></label>
    <button className="lighting-power primary" aria-pressed={on} onClick={()=>setOn(v=>!v)}><Power size={17}/>{on?'SWITCH LIGHT OFF':'SWITCH LIGHT ON'}</button>
    <button className="lighting-save secondary" onClick={save} aria-pressed={saved.includes(selected.id)}><Heart size={16} fill={saved.includes(selected.id)?'currentColor':'none'}/>{saved.includes(selected.id)?'SAVED TO YOUR LIGHTING EDIT':'SAVE TO MY LIGHTING EDIT'}</button>
    <p className="lighting-preview-note">Original product imagery with an illustrative light effect. Colour, brightness and room darkness are screen previews, not measured light output.</p>
   </div>
  </div>
  <div className="lighting-collection-heading"><div><span className="eyebrow">FROM A SINGLE BULB TO A STATEMENT PIECE.</span><h2>Find your <em>glow.</em></h2></div><span>{lightingCollection.length} REAL PRODUCT DESIGNS</span></div>
  <div className="lighting-filters" role="group" aria-label="Lighting category">{categories.map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</div>
  <div className="lighting-grid">{filtered.map(p=><article key={p.id} className={'lighting-card '+(selected.id===p.id?'is-selected':'')}><button className="lighting-card-select" onClick={()=>choose(p)} aria-label={`Preview ${p.name}`} aria-pressed={selected.id===p.id}><div className="lighting-card-image"><img src={p.image} alt={p.name+' '+p.subtitle} loading="lazy"/><span>{selected.id===p.id?<><Check size={13}/> SELECTED</>:<>PREVIEW <ArrowUpRight size={13}/></>}</span></div><div className="lighting-card-copy"><small>{p.category}{p.temperature?' · '+p.temperature+' K':''}</small><h3>{p.name}</h3><p>{p.subtitle}</p></div></button><a href={p.source} target="_blank" rel="noreferrer">Original product <ArrowUpRight size={13}/></a></article>)}</div>
  <div className="lighting-footer"><span>THE LIGHTING EDIT / NEXAISLE</span><p>Product names and imagery © Inter IKEA Systems B.V. Reference collection for the Nexaisle demo; no affiliation or live inventory.</p><span>{saved.length} SAVED {saved.length===1?'PIECE':'PIECES'}</span></div>
 </section>
}
