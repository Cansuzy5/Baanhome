import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const temp = mkdtempSync(resolve('.search-test-'));
try {
  const out = join(temp, 'search.cjs');
  await build({entryPoints:['src/utils/searchEngine.ts'], outfile:out, bundle:true, platform:'node', format:'cjs', logLevel:'silent'});
  const {executeInstantSearch, askGemini} = require(out);
  const item = (id,title,category,keywords,message) => ({id,title,category,keywords,customerMessage:message,summary:message,detail:[],status:'Published',audience:'Customer'});
  const data = [
    item('villa','พูลวิลล่า','pool-villa',['พูลวิลล่า'],'ที่พักพร้อมสระว่ายน้ำ'),
    item('resort-pet','สัตว์เลี้ยงในรีสอร์ท','resort-knowledge',['สัตว์เลี้ยง'],'รีสอร์ทรับสัตว์เลี้ยงตามเงื่อนไข'),
    item('villa-pet','สัตว์เลี้ยงในพูลวิลล่า','pool-villa',['สัตว์เลี้ยง'],'ตรวจเงื่อนไขสัตว์เลี้ยงของพูลวิลล่า'),
    item('KH-032','เวลาเช็คอินรีสอร์ท','resort-knowledge',['เช็คอิน'],'รีสอร์ทเช็คอินตามเวลาที่กำหนด'),
    item('villa-checkin','เวลาเช็คอินพูลวิลล่า','pool-villa',['เช็คอิน'],'พูลวิลล่าเช็คอินตามเวลาที่กำหนด'),
    item('meeting','ห้องประชุม VIP','mini-mice',['สัมมนา','จัดเลี้ยง','ห้อง vip'],'ห้องประชุมรองรับกลุ่มตามรูปแบบการจัด'),
    item('breakfast','อาหารเช้า','resort-knowledge',['อาหารเช้า'],'มีอาหารเช้าตามแพ็กเกจ'),
    item('phone','หมายเลขติดต่อ','business-profile',['หมายเลข'],'ติดต่อเจ้าหน้าที่'),
  ];
  const top = q => executeInstantSearch(q,data).results[0]?.item.id;
  assert.equal(top('พูลวิล่า'), 'villa');
  assert.equal(top('pool villa'), 'villa');
  assert.equal(top('พูลวิล่าเอาหมาไปได้ไหม'), 'villa-pet');
  assert.equal(top('รีสอร์ตเอาน้องแมวไปได้มั้ย'), 'resort-pet');
  assert.equal(top('pool villa check in กี่โมง'), 'villa-checkin');
  assert.equal(top('เชคอินรีสอทกี่โมง'), 'KH-032');
  assert.equal(top('มีห้องสัมนามั้ย'), 'meeting');
  assert.equal(top('มา 20 คน มีที่นั่งส่วนตัวไหม'), 'meeting');
  assert.equal(top('breakfast มีมั้ย'), 'breakfast');
  assert.equal(top('KH-032'), 'KH-032');
  assert.equal(executeInstantSearch('ซ่อมยานอวกาศ',data).results.length,0);
  assert.equal(executeInstantSearch('',data).results.length,0);
  assert.ok(!executeInstantSearch('หมา',data).results.some(r=>r.item.id==='phone'));
  const missingPolicy=data.filter(r=>r.id!=='villa-pet');
  assert.equal(executeInstantSearch('พูลวิลล่าเอาหมาไปได้ไหม',missingPolicy).results.length,0);
  let sent;
  globalThis.fetch=async (_url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>({answer:'คำตอบ',referenceIds:[]})};};
  await askGemini('พูลวิล่าเอาหมาไปได้ไหม',executeInstantSearch('พูลวิล่าเอาหมาไปได้ไหม',data).results);
  assert.deepEqual(sent.contextItems.map(x=>x.id),['villa-pet']);
  console.log('PASS: 15 retrieval/AI-context checks, aliases, colloquial group intent, unknown queries, dog word boundaries, exact IDs and service-policy isolation');
} finally { rmSync(temp,{recursive:true,force:true}); }
