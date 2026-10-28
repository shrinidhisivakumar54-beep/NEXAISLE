import { Component, Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, MessageCircle, RotateCcw } from 'lucide-react';
import { RailScene } from './RailScene';
import { atlasUrl, pieces, railPieces, pieceProduct, type EditorialPiece } from './collection';
import { money, type Product } from '../store';
import './fashion.css';

export function GarmentPhoto({piece,className=''}:{piece:EditorialPiece;className?:string}) {
  const [l,t,r,b]=piece.crop;
  return <div className={'fashion-cutout '+className} style={{aspectRatio:`${r-l} / ${b-t}`}} role="img" aria-label={pieceProduct(piece).name}>
    <img src={atlasUrl} alt="" draggable={false} style={{width:`${1536/(r-l)*100}%`,height:`${1024/(b-t)*100}%`,left:`${-l/(r-l)*100}%`,top:`${-t/(b-t)*100}%`}}/>
  </div>;
}
class RailBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}> {
  state={failed:false};static getDerivedStateFromError(){return {failed:true}}
  render(){return this.state.failed?this.props.fallback:this.props.children}
}
const positionPercent=(index:number,count:number)=>50+(-(count-1)*.54+index*1.08)/12.4*100;
export default function FashionShowroom({onProduct,onAssistant,focusRack,focusProductId,navigationKey}:{onProduct:(p:Product)=>void;onAssistant:()=>void;focusRack?:number|null;focusProductId?:string|null;navigationKey?:number}) {
  const [category,setCategory]=useState('The full rail');
  const [active,setActive]=useState<string|null>(null);const leaveTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);function activate(id:string|null){clearTimeout(leaveTimer.current);setActive(id)}function leavePiece(){clearTimeout(leaveTimer.current);leaveTimer.current=setTimeout(()=>setActive(null),180)}useEffect(()=>()=>clearTimeout(leaveTimer.current),[]);
  const [assets,setAssets]=useState<'loading'|'ready'|'error'>('loading');
  const scroll=useRef<HTMLDivElement>(null);
  const filtered=category==='The full rail'?railPieces:railPieces.filter(p=>p.category===category);
  const chosen=filtered.find(p=>p.id===active);
  const [can3d]=useState(()=>{try{const c=document.createElement('canvas');const gl=c.getContext('webgl2')||c.getContext('webgl');if(gl){gl.getExtension('WEBGL_lose_context')?.loseContext();return true}return false}catch{return false}});
  useEffect(()=>{const image=new Image();image.onload=()=>setAssets('ready');image.onerror=()=>setAssets('error');image.src=atlasUrl;return()=>{image.onload=null;image.onerror=null}},[]);
  useEffect(()=>{if(!focusRack)return;setCategory('The full rail');const index=railPieces.findIndex(p=>focusProductId?p.id===focusProductId:pieceProduct(p).aisle===focusRack);if(index<0&&focusProductId){requestAnimationFrame(()=>{const card=document.querySelector<HTMLElement>(`[data-fashion-product="${focusProductId}"]`);card?.scrollIntoView({behavior:'smooth',block:'center'});card?.focus({preventScroll:true})})}if(index>=0){setActive(railPieces[index].id);requestAnimationFrame(()=>{scroll.current?.scrollTo({left:index*90-100,behavior:'smooth'});scroll.current?.scrollIntoView({behavior:'smooth',block:'center'})})}},[focusRack,focusProductId,navigationKey]);
  function selectCategory(next:string){setCategory(next);setActive(null);scroll.current?.scrollTo({left:0,behavior:'smooth'})}
  const flatRail=<div className="fashion-flat-rail"><div className="flat-metal-rail"/>{filtered.map((piece,index)=><div key={piece.id} className={'flat-piece '+(active===piece.id?'is-active':'')} style={{left:positionPercent(index,filtered.length)+'%'}}><span className="flat-hook"/><span className="flat-hanger"/><GarmentPhoto piece={piece}/></div>)}</div>;
  return <section className="fashion-showroom" aria-label="NEXAISLE fashion showroom">
    <div className="atelier-topline"><span>NEXAISLE / FASHION WORLD</span><button onClick={onAssistant}><MessageCircle size={13}/> STYLE CONCIERGE</button><span>COLLECTION № 002</span></div>
    <div className="atelier-intro"><span className="atelier-kicker">A MORE CONSIDERED WARDROBE</span><h1>The art of <em>getting dressed.</em></h1><p>Good pieces. Real texture. A little room to find your own style.</p></div>
    <div className="atelier-collection-nav"><div role="group" aria-label="Filter the clothing rail">{['The full rail','Tops','Layers','Dresses'].map(c=><button key={c} aria-pressed={category===c} onClick={()=>selectCategory(c)}>{c}</button>)}</div><span>HOVER TO DISCOVER <ArrowUpRight size={12}/></span></div>
    <div className="fashion-rail-shell" onMouseLeave={()=>activate(null)} onKeyDown={e=>{if(e.key==='Escape')setActive(null)}}>
      <div className="fashion-rail-scroll" ref={scroll}>
        <div className={'fashion-rail-stage '+(assets==='loading'?'is-loading':'')}>
          {assets==='ready'?(can3d?<RailBoundary fallback={flatRail}><Suspense fallback={<div className="rail-loading">Preparing the rail…</div>}><RailScene pieces={filtered} active={active}/></Suspense></RailBoundary>:flatRail):<div className="rail-loading">{assets==='error'?<>The collection imagery couldn’t load. <button onClick={()=>window.location.reload()}>Try again</button></>:'Unfolding the collection…'}</div>}
          {assets==='ready'&&<div className="rail-targets">{filtered.map((piece,index)=><button key={piece.id} className="rail-target" style={{left:positionPercent(index,filtered.length)+'%'}} onMouseEnter={()=>activate(piece.id)} onMouseLeave={leavePiece} onFocus={()=>activate(piece.id)} onClick={()=>activate(piece.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onProduct(pieceProduct(piece))}}} aria-pressed={active===piece.id} aria-label={`Discover ${pieceProduct(piece).name}`}><span>{pieceProduct(piece).name}</span></button>)}</div>}
          {chosen&&<div className="rail-product-caption" onMouseEnter={()=>clearTimeout(leaveTimer.current)} onMouseLeave={leavePiece} style={{left:`clamp(115px, ${positionPercent(filtered.indexOf(chosen),filtered.length)}%, calc(100% - 115px))`}} aria-live="polite"><div><h3>{pieceProduct(chosen).name}</h3><span>{money(pieceProduct(chosen).price)}</span></div><p><span className="fashion-shade" style={{background:chosen.color}}/>{chosen.shade} <small> / 1 shade</small></p><button onClick={()=>onProduct(pieceProduct(chosen))}>VIEW PRODUCT <ArrowUpRight size={13}/></button></div>}
        </div>
      </div>
      <div className="rail-paging"><span>{String(filtered.length).padStart(2,'0')} PIECES ON THE RAIL</span><div><button aria-label="Scroll rail left" onClick={()=>scroll.current?.scrollBy({left:-350,behavior:'smooth'})}><ArrowLeft size={15}/></button><span>DRAG / SCROLL TO EXPLORE</span><button aria-label="Scroll rail right" onClick={()=>scroll.current?.scrollBy({left:350,behavior:'smooth'})}><ArrowRight size={15}/></button></div><button onClick={()=>{setActive(null);scroll.current?.scrollTo({left:0,behavior:'smooth'})}}><RotateCcw size={11}/> RESET RAIL</button></div>
    </div>
    <div className="atelier-signoff"><span>AN EDIT, NOT AN ALGORITHM.</span><h2>This week’s <em>rail.</em></h2><p>Pick a piece. Turn it toward you. Make it yours.</p><a href="#fashion-edit">EXPLORE THE EDIT <ArrowDown size={12}/></a></div>
    <div className="fashion-editorial-strip"><span>FEWER PIECES. MORE POSSIBILITY.</span><span>✳</span><span>A DIFFERENT WAY TO DISCOVER.</span><span>✳</span><span>THE NEXAISLE ATELIER.</span></div>
    <section className="fashion-edit" id="fashion-edit"><div className="fashion-edit-heading"><div><span>IN FOCUS / THE FINISHING TOUCHES</span><h2>Consider the <em>details.</em></h2></div><p>Explore the complete edit.<br/>Open any piece for a closer look.</p></div><div className="fashion-edit-grid">{pieces.map(piece=><button key={piece.id} className="fashion-edit-card" data-fashion-product={piece.id} onClick={()=>onProduct(pieceProduct(piece))}><div><GarmentPhoto piece={piece}/><span>DISCOVER <ArrowUpRight size={14}/></span></div><h3>{pieceProduct(piece).name}<b>{money(pieceProduct(piece).price)}</b></h3><p><span className="fashion-shade" style={{background:piece.color} as CSSProperties}/>{piece.shade}</p></button>)}</div></section>
    <div className="atelier-footer"><span>NEXAISLE ATELIER</span><span>DEMO COLLECTION / NO REAL PAYMENTS</span><button onClick={onAssistant}>A LITTLE HELP WITH YOUR EDIT? ↗</button></div>
  </section>;
}
