import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateFit} from './fit.mjs';
test('rejects invalid or unsupported foot lengths',()=>{for(const n of [NaN,Infinity,19.9,33.1])assert.equal(estimateFit(n),null);assert.ok(estimateFit(20));assert.ok(estimateFit(33))});
test('adult estimated sizes stay monotonic and round to half sizes',()=>{let last=null;for(let n=200;n<=330;n++){const sizes=estimateFit(n/10);for(const k of ['eu','uk','usMen','usWomen']){assert.equal((sizes[k]*2)%1,0);if(last)assert.ok(sizes[k]>=last[k])}assert.equal(sizes.usMen-sizes.uk,1);assert.equal(sizes.usWomen-sizes.uk,2.5);last=sizes}});
