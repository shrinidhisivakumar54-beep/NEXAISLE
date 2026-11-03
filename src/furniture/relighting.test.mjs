import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildLightField,fixtureSources,relightPixels} from './relighting.ts';
const pixels=new Uint8ClampedArray([105,110,120,255,35,30,25,120,0,0,0,255]);
const field={irradiance:new Float32Array([.8,.5,.8]),emission:new Float32Array([.2,0,1])};
const options={on:true,night:false,tone:'warm',strength:75};
test('daylight OFF preserves the original image, including alpha',()=>{
 const output=relightPixels(pixels,field,{...options,on:false});
 for(let i=0;i<pixels.length;i++)assert.ok(Math.abs(output[i]-pixels[i])<=1);
 assert.equal(output[7],120);
});
test('OFF ignores intensity and zero intensity has no lamp contribution',()=>{
 const off=relightPixels(pixels,field,{...options,on:false,night:true});
 assert.deepEqual(relightPixels(pixels,field,{...options,night:true,strength:0}),off);
 assert.deepEqual(relightPixels(pixels,field,{...options,on:false,night:true,strength:100}),off);
});
test('brightness is monotonic and preserves black surfaces rather than painting an opaque halo',()=>{
 let previous=relightPixels(pixels,field,{...options,strength:0});
 for(const strength of [10,25,50,75,100]){const next=relightPixels(pixels,field,{...options,strength});for(let i=0;i<next.length;i++)if(i%4!==3)assert.ok(next[i]>=previous[i]);assert.deepEqual([...next.slice(8,11)],[0,0,0]);previous=next;}
});
test('distance falloff is anchored to the source and moving the lamp moves the field',()=>{
 const a=buildLightField(101,101,[[25,30,1]],'chandelier');
 const b=buildLightField(101,101,[[75,30,1]],'chandelier');
 assert.ok(a.irradiance[35*101+25]>a.irradiance[90*101+90]);
 assert.ok(a.emission[30*101+25]>b.emission[30*101+25]);
 assert.ok(b.emission[30*101+75]>a.emission[30*101+75]);
});
test('fixture profiles use separate chandelier bulbs and a wider diffusing shade',()=>{
 const sources=fixtureSources('Chandeliers');assert.equal(sources.length,3);
 const shade=fixtureSources('Table lamps');assert.equal(shade.length,1);
 const field=buildLightField(20,20,sources,'chandelier');assert.equal(field.irradiance.length,400);assert.ok([...field.irradiance,...field.emission].every(Number.isFinite));
});
