import test from 'node:test';
import assert from 'node:assert/strict';
import {orbitPosition,advanceCarousel,CAROUSEL_RADIUS} from './carouselMotion.ts';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} differs from ${b}`);
test('all four watches stay on one circle throughout a complete revolution',()=>{for(let i=0;i<4;i++)for(let frame=0;frame<=360;frame++){const a=frame*Math.PI/180,[x,z]=orbitPosition(a,i),[xx,zz]=orbitPosition(a+2*Math.PI,i);near(Math.hypot(x,z),CAROUSEL_RADIUS);near(x,xx);near(z,zz)}});
test('each watch reaches the front in turn',()=>{for(let i=0;i<4;i++){const [x,z]=orbitPosition(-i*Math.PI/2,i);near(x,0);near(z,CAROUSEL_RADIUS)}});
test('orbit advances equally at 30, 60 and 120 fps without wrapping discontinuities',()=>{for(const fps of [30,60,120]){let angle=0;for(let n=0;n<fps*60;n++)[angle]=advanceCarousel(angle,0,1/fps,true,false,false);near(angle,6.6);assert.ok(angle>2*Math.PI)}});
test('selection freezes automatic motion and pending manual motion',()=>assert.deepEqual(advanceCarousel(2,Math.PI/2,.05,true,true,false),[2,Math.PI/2]));
test('manual quarter turns ease consistently across frame rates',()=>{for(const fps of [30,60,120]){let angle=0,pending=Math.PI/2;for(let n=0;n<fps*3;n++)[angle,pending]=advanceCarousel(angle,pending,1/fps,false,false,false);near(angle,Math.PI/2*(1-Math.exp(-9)));near(angle+pending,Math.PI/2)}});
