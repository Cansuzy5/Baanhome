import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const out = await build({entryPoints:['src/utils/privateChatPayload.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {chatPayload}=await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
const now=Date.parse('2026-10-13T07:00:00Z');
const turn=(id,date=now)=>({id,question:'ราคาเท่าไหร่',searchQuery:'ราคา',sourceIds:['BH-1'],createdAt:new Date(date).toISOString(),usedContext:false,aiAnswer:{customerAnswer:'ราคาเดิม',staffAnswer:'ตรวจราคาก่อนตอบ',references:['BH-1']}});
test('keeps recent text and answers, drops old/future/invalid entries and unrelated data',()=>{
 const data=JSON.parse(chatPayload([{...turn('ok'),image:'secret-image',password:'secret'},turn('old',now-31*86400000),turn('future',now+1),null,{}],now));
 assert.equal(data.length,1);assert.equal(data[0].aiAnswer.customerAnswer,'ราคาเดิม');assert.equal(data[0].restored,true);assert.equal(data[0].password,undefined);assert.equal(data[0].image,undefined);
});
test('keeps only latest 20 turns',()=>{const d=JSON.parse(chatPayload(Array.from({length:25},(_,i)=>turn(String(i))),now));assert.equal(d.length,20);assert.equal(d[0].id,'5');});
test('rejects large UTF-8 payload without silently cutting answers',()=>{assert.throws(()=>chatPayload(Array.from({length:20},(_,i)=>({...turn(String(i)),aiAnswer:{customerAnswer:'ก'.repeat(20000)}})),now),/180 KB/);});
test('invalid top-level data rejected; empty backup valid',()=>{assert.throws(()=>chatPayload({},now));assert.equal(chatPayload([],now),'[]');});
