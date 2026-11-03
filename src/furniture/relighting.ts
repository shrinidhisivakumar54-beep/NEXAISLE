export type LightSource=readonly [number,number,number];
export type FixtureKind='chandelier'|'shade'|'bulb';
export type LightField={irradiance:Float32Array;emission:Float32Array};
export function fixtureSources(category:string,position?:{x:number;y:number}):LightSource[]{
 const x=position?.x??50,y=position?.y??35;
 if(category==='Chandeliers')return [[x-4,y,1],[x,y-1.5,1],[x+4,y,1]];
 return [[x,y,category==='Bulbs'?2:6]];
}
// A 2D photographic approximation, not a geometry reconstruction or photometric model.
// Reflected light is modulated by the source pixels; no coloured glow is painted over the room.
export function buildLightField(width:number,height:number,sources:readonly LightSource[],kind:FixtureKind):LightField{
 const irradiance=new Float32Array(width*height),emission=new Float32Array(width*height);
 const aspect=width/height;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const px=(x+.5)/width,py=(y+.5)/height,index=y*width+x;
  let reflected=0,emitted=0;
  for(const [sx,sy,radius] of sources){
   const dx=(px-sx/100)*aspect,dy=py-sy/100;
   // Wide, gradual distance falloff; upward spill is weaker than light into the room.
   const distance=dx*dx+dy*dy*.78;
   const direction=.52+.48/(1+Math.exp(-dy*18));
   reflected+=direction/(1+distance*23);
   const rx=kind==='chandelier'?.0045:Math.max(.007,radius/100*.28);
   const ry=kind==='chandelier'?.007:rx*.75;
   emitted=Math.max(emitted,Math.exp(-.5*((dx/rx)**2+(dy/ry)**2)));
  }
  irradiance[index]=sources.length?reflected/sources.length:0;
  emission[index]=emitted;
 }
 return {irradiance,emission};
}
const linear=Float32Array.from({length:256},(_,i)=>{const s=i/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4});
const encoded=Uint8ClampedArray.from({length:16385},(_,i)=>{const l=i/16384;return Math.round(255*(l<=.0031308?l*12.92:1.055*l**(1/2.4)-.055))});
export function relightPixels(input:Uint8ClampedArray,field:LightField,options:{on:boolean;night:boolean;tone:'warm'|'white';strength:number},output=new Uint8ClampedArray(input.length)){
 const power=options.on?Math.max(0,Math.min(100,options.strength))/100:0;
 const ambient=options.night?.065:1;
 const bounce=options.night?2.7:.42;
 const tint=options.tone==='warm'?[1,.76,.49]:[.9,.96,1];
 for(let p=0,i=0;i<input.length;i+=4,p++){
  const luminance=.2126*linear[input[i]]+.7152*linear[input[i+1]]+.0722*linear[input[i+2]];
  // Tiny source highlights follow existing bulb detail. Dark metal and room shadows stay dark.
  const bulb=power*field.emission[p]*Math.min(1,luminance*2.5)*.9;
  for(let c=0;c<3;c++){
   const reflectance=linear[input[i+c]],base=reflectance*ambient;
   const energy=reflectance*field.irradiance[p]*power*bounce*tint[c];
   // A soft highlight shoulder avoids the flat white patches from simple exposure multiplication.
   let value=base+(1-base)*(1-Math.exp(-energy/(1-base+.12)));
   value+=(1-value)*bulb*(options.tone==='warm'?[1,.94,.79][c]:[.94,.98,1][c]);
   output[i+c]=encoded[Math.round(Math.min(1,Math.max(0,value))*16384)];
  }
  output[i+3]=input[i+3];
 }
 return output;
}
