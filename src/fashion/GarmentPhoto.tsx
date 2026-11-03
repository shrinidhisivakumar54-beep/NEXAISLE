import { atlasUrl, pieceProduct, type EditorialPiece } from './collection';

export default function GarmentPhoto({piece,className=''}:{piece:EditorialPiece;className?:string}) {
  const [l,t,r,b]=piece.crop;
  return <div className={'fashion-cutout '+className} style={{aspectRatio:`${r-l} / ${b-t}`}} role="img" aria-label={pieceProduct(piece).name}>
    <img src={atlasUrl} alt="" draggable={false} style={{width:`${1536/(r-l)*100}%`,height:`${1024/(b-t)*100}%`,left:`${-l/(r-l)*100}%`,top:`${-t/(b-t)*100}%`}}/>
  </div>;
}
