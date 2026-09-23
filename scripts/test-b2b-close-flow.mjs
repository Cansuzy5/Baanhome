import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const temp=mkdtempSync(resolve('.b2b-flow-'));
const storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
globalThis.window={dispatchEvent(){}};
let payload, version=0, fail=false, snapshot, observed, invalidResponse=false;
const checkDefined=value=>{if(value===undefined)throw Error('Firestore rejects undefined');if(value&&typeof value==='object')Object.values(value).forEach(checkDefined);};
globalThis.__db={
 doc:()=>({}),
 getDocFromServer:async()=>({exists:()=>true,data:()=>({payload,version})}),
 onSnapshot:(_ref,_options,callback)=>{snapshot=callback;return()=>{};},
 runTransaction:async(_db,fn)=>{
   let staged;
   const result=await fn({get:async()=>({exists:()=>true,data:()=>({payload,version})}),set:(_ref,data)=>{checkDefined(data);staged=data;}});
   if(fail)throw Object.assign(Error('offline'),{code:'unavailable'});
   if(staged){payload=staged.payload;version=staged.version;}
   return result;
 }
};
const mock={name:'isolated-firestore',setup(b){
 b.onResolve({filter:/firebase\/firestore$|\/firebase$|_db\.js$/},args=>({path:args.path,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`export const db={}; export const getOperationalDb=()=>db; export const getLegacyDb=()=>db; export const {doc,getDocFromServer,onSnapshot,runTransaction}=globalThis.__db;`,loader:'js'}));
}};
async function bundle(entry,name,plugins=[]){const out=join(temp,name+'.cjs');await build({entryPoints:[entry],outfile:out,bundle:true,platform:'node',format:'cjs',packages:'external',plugins,logLevel:'silent'});return require(out);}
try{
 const {applyB2BMutation}=await bundle('lib/b2bMutation.ts','mutation');
 const {default:handler}=await bundle('api/sync/b2b.ts','handler',[mock]);
 const service=await bundle('src/utils/b2bService.ts','service',[mock]);
 globalThis.fetch=async(_url,options)=>{
  let code=200,value;
  await handler({method:options.method,headers:{},body:options.body?JSON.parse(options.body):undefined},{setHeader(){},status(n){code=n;return this;},json(v){value=v;return this;},end(){}});
  if(invalidResponse&&options.method==='POST')value={success:true,leads:[],appointments:[]};
  return {ok:code>=200&&code<300,json:async()=>value};
 };
 payload={leads:[{id:'L',name:'องค์กร A',pipelineStage:'ยังไม่ติดต่อ',history:[{id:'old'}]},{id:'other',name:'องค์กร A'}],appointments:[]};
 const stop=service.subscribeCentralB2B(x=>observed=x);
 const save=async(body)=>{payload=applyB2BMutation(payload,body);version++;};
 const appointment={id:'A',title:'นัดทดสอบ',location:'บ้านโฮม',objective:'อื่นๆ',leadId:'L',leadName:'องค์กร A',status:'scheduled',date:'2026-09-22',time:'10:00',createdAt:'2026-09-22'};
 await save({action:'workflow',lead:{...payload.leads[0],pipelineStage:'นัดเข้าพบ'},appointment});
 assert.equal(payload.appointments[0].status,'scheduled');
 const early=await service.closeCentralB2BSalesCycleFromAppointment('A','success','2026-09-25T09:00:00Z','C','u','user','Operator');
 assert.equal(early.success,false);
 await save({action:'workflow',lead:{...payload.leads.find(x=>x.id==='L'),pipelineStage:'ติดตามต่อ'},appointment:{...payload.appointments[0],status:'completed'}});
 const oldSnapshot=structuredClone({payload,version});
 let result=await service.closeCentralB2BSalesCycleFromAppointment('A','success','2026-09-25T09:00:00Z','C','u','user','Operator');
 assert.equal(result.success,true,result.error);
 assert.equal(observed.appointments[0].salesCycleOutcome,'success');
 assert.equal(observed.appointments[0].salesCycleClosedAt,'2026-09-25T09:00:00Z');
 assert.equal(observed.appointments[0].status,'completed');
 let lead=payload.leads.find(x=>x.id==='L');
 assert.equal(lead.pipelineStage,'ยังไม่ติดต่อ');assert.equal(lead.salesClosures.length,1);
 assert.equal(lead.salesClosures[0].sourceAppointmentId,'A');assert.ok(lead.history.some(x=>x.id==='old'));
 checkDefined(payload);
 snapshot({metadata:{fromCache:false,hasPendingWrites:false},exists:()=>true,data:()=>oldSnapshot});
 assert.equal(observed.appointments[0].salesCycleOutcome,'success','older snapshot must not undo response');
 result=await service.closeCentralB2BSalesCycleFromAppointment('A','success','2026-09-25T09:00:00Z','retry','u','user','Operator');
 assert.equal(result.success,true);assert.equal(payload.leads.find(x=>x.id==='L').salesClosures.length,1);
 const archived=structuredClone(payload.appointments.find(x=>x.id==='A'));
 await save({action:'workflow',lead:{...payload.leads.find(x=>x.id==='L'),pipelineStage:'นัดเข้าพบ'},appointment:{...appointment,id:'B',date:'2026-10-05'}});
 assert.deepEqual(payload.appointments.find(x=>x.id==='A'),archived);
 assert.equal(payload.appointments.find(x=>x.id==='B').salesCycleClosedAt,undefined);
 assert.throws(()=>applyB2BMutation(payload,{action:'upsert',collection:'appointments',item:{...archived,status:'scheduled'}}));
 assert.throws(()=>applyB2BMutation(payload,{action:'delete',collection:'appointments',id:'A'}));
 await save({action:'workflow',lead:{...payload.leads.find(x=>x.id==='L'),pipelineStage:'ติดตามต่อ'},appointment:{...payload.appointments.find(x=>x.id==='B'),status:'completed'}});
 fail=true;const before=structuredClone(payload);
 result=await service.closeCentralB2BSalesCycleFromAppointment('B','unsuccessful','2026-10-06T09:00:00Z','C2','u','user','Operator');
 assert.equal(result.success,false);assert.deepEqual(payload,before);fail=false;
 result=await service.closeCentralB2BSalesCycleFromAppointment('B','unsuccessful','2026-10-06T09:00:00Z','C2','u','user','Operator');
 assert.equal(result.success,true,result.error);assert.equal(payload.appointments.find(x=>x.id==='B').salesCycleOutcome,'unsuccessful');
 assert.deepEqual(payload.appointments.find(x=>x.id==='A'),archived);
 invalidResponse=true;
 result=await service.closeCentralB2BSalesCycleFromAppointment('B','unsuccessful','2026-10-06T09:00:00Z','C2','u','user','Operator');assert.equal(result.success,false);invalidResponse=false;
 stop();
 // Render actual components: pre-visit has no organization dropdown; closure renders its own outcome/date.
 const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
 const {B2BCalendarView}=await bundle('src/components/B2BCalendarView.tsx','calendar');
 const {AddAppointmentModal}=await bundle('src/components/AddAppointmentModal.tsx','modal');
 const noop=()=>{};
 const cal=(a)=>renderToStaticMarkup(React.createElement(B2BCalendarView,{appointments:[a],leads:payload.leads,onAddAppointment:noop,onEditAppointment:noop,onDeleteAppointment:noop,onUpdateLeadStage:noop,onCloseDeal:noop}));
 assert.ok(cal(archived).includes('ปิดดีลสำเร็จ'));assert.ok(cal(archived).includes('วันที่ปิดดีล'));
 const modal=(a)=>renderToStaticMarkup(React.createElement(AddAppointmentModal,{isOpen:true,editAppointment:a,leads:payload.leads,onClose:noop,onSave:noop,onReschedule:noop,onComplete:noop,onCancelAppointment:noop,onNotMet:noop,onUpdateLeadStage:noop,onEditLead:noop}));
 assert.ok(!modal(appointment).includes('สถานะการติดตามองค์กร'));
 assert.ok(modal({...appointment,status:'completed'}).includes('สถานะการติดตามองค์กร'));
 const closed=modal(archived);assert.ok(closed.includes('ปิดดีลสำเร็จ'));assert.ok(!closed.includes('<select'));assert.ok(!closed.includes('บันทึกรายละเอียด'));
 console.log('PASS: exact appointment, success/failure rounds, Firestore-compatible values, API response verification, transaction failure, idempotency, old snapshot rejection, new cycle isolation, archived read-only, rendered dropdown/closure UI');
}finally{rmSync(temp,{recursive:true,force:true});}
