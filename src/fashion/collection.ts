import { products, type Product } from '../store';

export type EditorialPiece = {
  id: string;
  crop: [number, number, number, number];
  width: number;
  shade: string;
  color: string;
  category: 'Tops' | 'Layers' | 'Dresses';
  description: string;
};
// Pixel bounds reference the original transparent atlas; images are never fetched remotely.
export const pieces: EditorialPiece[] = [
  { id: 'f12', crop: [67,8,396,315], width:1.05, shade:'Washed charcoal',color:'#484842', category:'Tops',description:'An oversized silhouette with a botanical graphic, a softly faded finish and an easy dropped shoulder.' },
  { id: 'f1',crop:[461,15,741,313],width:.88,shade:'Soft ivory',color:'#e5decd',category:'Tops',description:'A considered everyday essential. A fitted crew neck, clean short sleeves and soft cotton texture.' },
  { id:'f0',crop:[434,669,763,994],width:1.08,shade:'Warm ecru',color:'#ddd2bd',category:'Layers',description:'A generous hood, a kangaroo pocket and heavyweight texture. Made for slower mornings.' },
  { id:'f6',crop:[52,333,389,658],width:1.04,shade:'Blue stripe',color:'#9db5ca',category:'Tops',description:'An airy striped button-down, with relaxed sleeves and an effortless, softly crumpled drape.' },
  { id:'f2',crop:[789,8,1139,310],width:1.08,shade:'Deep cobalt',color:'#243b69',category:'Layers',description:'A quietly confident bomber silhouette with a clean zip front, ribbed cuffs and a rich cobalt finish.' },
  { id:'f4',crop:[1244,8,1437,327],width:.96,shade:'Oxblood',color:'#702d34',category:'Dresses',description:'A sculpted waist gives way to a fluid midi skirt. Deep oxblood brings a little drama to everyday dressing.' },
  { id:'f7',crop:[434,346,760,653],width:1.02,shade:'Oatmeal',color:'#c6b69a',category:'Layers',description:'Tactile cable-knit detail, warm buttons and a relaxed V-neck. A timeless layer with a softer touch.' },
  { id:'f8',crop:[868,304,1061,654],width:.84,shade:'Olive',color:'#565a3d',category:'Layers',description:'Long, clean lines and a tailored lapel. An understated coat with a rich, textured wool appearance.' },
  { id:'f9',crop:[1195,345,1471,662],width:.88,shade:'Graphite',color:'#595a5d',category:'Dresses',description:'Crisp pleats and a softly structured midi shape. An adaptable foundation for a considered wardrobe.' },
  { id:'f10',crop:[91,695,351,1001],width:.88,shade:'Sand',color:'#b5a183',category:'Layers',description:'A utility-inspired vest with considered pockets, natural canvas texture and an easy, relaxed cut.' },
  { id:'f3',crop:[839,664,1090,1011],width:.8,shade:'Charcoal',color:'#656363',category:'Layers',description:'Wide-leg tailoring with a clean waist and a soft, generous drape.' },
  { id:'f11',crop:[1192,734,1486,973],width:.9,shade:'Espresso',color:'#543b2e',category:'Layers',description:'An expressive leather ankle boot with a sculpted heel and rich brown finish.' },
];
export const railPieces = pieces.slice(0,10);
export const findPiece = (id: string) => pieces.find(piece => piece.id === id);
export const pieceProduct = (piece: EditorialPiece): Product => products.find(p => p.id === piece.id)!;
export const atlasUrl = '/fashion/collection-atlas.png';
