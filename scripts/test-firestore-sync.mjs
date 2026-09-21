import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync,rmSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { webcrypto } from 'node:crypto';
const dir=mkdtempSync(resolve('.firestore-test-'));
const rows=new Map(), watchers=new Set();let fail=false;let chain=Promise.resolve();
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
globalThis.window={crypto:webcrypto,dispatchEvent:()=>{}};
const snap=ref=>({id:ref.path.split('/').at(-1),ref,exists:()=>rows.has(ref.path),data:()=>structuredClone(rows.get(ref.path)),metadata:{fromCache:false,hasPendingWrites:false}});
const list=ref=>{let docs=[...rows.keys()].filter(p=>p.startsWith(ref.path+'/')&&!p.slice(ref.path.length+1).includes('/')).map(p=>snap({path:p}));for(const f of ref.filters||[])if(f.kind==='where')docs=docs.filter(d=>d.data()[f.field]===f.value);return {docs,empty:!docs.length,size:docs.length,metadata:{fromCache:false,hasPendingWrites:false}};};
const emit=()=>watchers.forEach(w=>w.fn(w.ref.kind==='collection'?list(w.ref):snap(w.ref)));
const check=()=>{if(fail)throw Error('simulated database failure');};
globalThis.__firebaseMock={
 collection:(_,path)=>({kind:'collection',path}),doc:(database,path,id)=>({kind:'doc',path:(database?.legacy?'legacy/':'')+path+'/'+id}),
 query:(ref,...filters)=>({...ref,filters}),where:(field,op,value)=>({kind:'where',field,value}),orderBy:()=>({}),limit:()=>({}),serverTimestamp:()=>new Date().toISOString(),
 getDocsFromServer:async ref=>{check();return list(ref);},getDocFromServer:async ref=>{check();return snap(ref);},getDocs:async ref=>{check();return list(ref);},
 setDoc:async(ref,value)=>{check();rows.set(ref.path,structuredClone(value));emit();},
 updateDoc:async(ref,value)=>{check();if(!rows.has(ref.path))throw Error('not found');rows.set(ref.path,{...rows.get(ref.path),...value});emit();},
 deleteDoc:async ref=>{check();rows.delete(ref.path);emit();},
 onSnapshot:(ref,opts,fn,error)=>{if(typeof opts==='function')fn=opts;const w={ref,fn};watchers.add(w);fn(ref.kind==='collection'?list(ref):snap(ref));return ()=>watchers.delete(w);},
 runTransaction:(_,fn)=>{const run=async()=>{check();const pending=[];const tx={get:async ref=>snap(ref),set:(ref,value)=>pending.push([ref,value])};const result=await fn(tx);check();pending.forEach(([ref,value])=>rows.set(ref.path,structuredClone(value)));emit();return result;};const next=chain.then(run,run);chain=next.catch(()=>{});return next;},
 writeBatch:()=>{const updates=[];return {update:(ref,v)=>updates.push([ref,v]),commit:async()=>{check();updates.forEach(([ref,v])=>rows.set(ref.path,{...rows.get(ref.path),...v}));emit();}};}
};
const plugin={name:'mock-firestore',setup(b){
 b.onResolve({filter:/^firebase\/firestore$/},()=>({path:'sdk',namespace:'mock'}));
 b.onResolve({filter:/^(\.\/firebase|\.\.\/_db\.js)$/},()=>({path:'db',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='sdk'?Object.keys(globalThis.__firebaseMock).map(k=>`export const ${k}=globalThis.__firebaseMock.${k};`).join('\n'):'export const db={};export const getDb=()=>({legacy:true});export const getOperationalDb=()=>db;export const setCorsHeaders=res=>res.setHeader("test","1");'}));
}};
async function module(entry,name){const outfile=join(dir,name+'.mjs');await build({entryPoints:[entry],outfile,bundle:true,platform:'node',format:'esm',plugins:[plugin]});return import(pathToFileURL(outfile));}
try{
 const auth=await module('src/utils/authService.ts','auth');
 const handler=(await module('api/sync/b2b.ts','handler')).default;
 const device1=await module('src/utils/b2bService.ts','device1');const device2=await module('src/utils/b2bService.ts','device2');
 const request=async(method,body)=>{let status,payload;await handler({method,body},{setHeader(){},status(code){status=code;return this;},json(data){payload=data;return this;},end(){}});return {status,payload};};
 globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/sync/b2b','no whole-cache user writes');const r=await request(options.method,options.body?JSON.parse(options.body):undefined);return {ok:r.status===200,json:async()=>r.payload};};
 const admin={id:'admin_test',name:'Test',username:'test',role:'Administrator',department:'Test',status:'active'};
 let users;const stop=auth.subscribeUsers(value=>users=value);
 const input={username:'employee',name:'Employee',department:'Test',role:'Knowledge User',plainPassword:'test-pass'};
 const results=await Promise.allSettled([auth.createNewUser(input,admin),auth.createNewUser(input,admin)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1,'concurrent duplicate username rejected');assert.equal(users.length,1);
 const user=users[0];
 fail=true;await assert.rejects(auth.createNewUser({...input,username:'failed'},admin));assert.equal(users.length,1,'failed create never published');await assert.rejects(auth.deleteUser(user.id,admin));assert.equal(users.length,1,'failed delete preserved');fail=false;
 await auth.toggleUserStatus(user.id,'inactive',admin);assert.equal((await auth.authenticateLogin('employee','test-pass')).success,false,'central suspended state wins');
 await auth.toggleUserStatus(user.id,'active',admin);assert.equal((await auth.authenticateLogin('employee','test-pass')).success,true);
 await auth.deleteUser(user.id,admin);assert.deepEqual(users,[],'last user removal clears display');
 storage.set('baanhome_app_users_v1',JSON.stringify([user]));assert.equal((await auth.authenticateLogin('employee','test-pass')).success,false,'stale cache cannot restore deleted login');stop();
 rows.set('legacy/systemConfig/b2b',{payload:{leads:[{id:'old-lead'}],appointments:[{id:'old-appointment'}]}});
 const imported=await request('GET');assert.equal(imported.payload.appointments[0].id,'old-appointment','legacy durable B2B preserved');
 rows.set('systemConfig/b2b',{payload:{leads:[],appointments:[]}});
 assert.deepEqual((await request('GET')).payload.appointments,[],'empty canonical document must not resurrect legacy appointments');
 let one,two;const stop1=device1.subscribeCentralB2B(v=>one=v),stop2=device2.subscribeCentralB2B(v=>two=v);
 assert.deepEqual(one.appointments,[]);
 assert.equal((await device1.saveCentralB2BAppointment({id:'apt1',title:'Test'},'Operator')).success,true);assert.equal(two.appointments[0].title,'Test','other device receives create');
 assert.equal((await device2.saveCentralB2BAppointment({id:'apt1',title:'Updated'},'Operator')).success,true);assert.equal(one.appointments[0].title,'Updated');
 fail=true;assert.equal((await device1.deleteCentralB2BAppointment('apt1','Administrator')).success,false);assert.equal(two.appointments.length,1);fail=false;
 assert.equal((await device1.deleteCentralB2BAppointment('apt1','Administrator')).success,true);assert.deepEqual(one.appointments,[]);assert.deepEqual(two.appointments,[]);
 assert.equal((await request('POST',{appointments:[{id:'stale'}]})).status,400,'bulk snapshot overwrite disabled');
 assert.equal((await device1.deleteCentralB2BAppointment('unknown','Operator')).success,false);
 stop1();stop2();
 console.log('PASS: central users, concurrent duplicate creation, failure preservation, central login/status, last deletion, two-device appointment create/edit/delete, no bulk overwrite. Mock Firestore only; no live data modified.');
}finally{rmSync(dir,{recursive:true,force:true});}
