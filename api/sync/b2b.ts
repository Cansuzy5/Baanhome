import { doc, getDocFromServer, runTransaction } from 'firebase/firestore';
import { getDb, getOperationalDb } from '../_db.js';
import { setCorsHeaders } from '../../lib/cors.js';
import { applyB2BMutation, type B2BData } from '../../lib/b2bMutation.js';
const normalize = (value: any): B2BData => ({ leads: Array.isArray(value?.leads) ? value.leads : [], appointments: Array.isArray(value?.appointments) ? value.appointments : [] });
export default async function handler(req: any, res: any) {
 setCorsHeaders(res); res.setHeader('Cache-Control', 'no-store');
 if(req.method === 'OPTIONS') return res.status(200).end();
 if(!['GET','POST'].includes(req.method)) return res.status(405).json({error:'Method Not Allowed'});
 if(req.method === 'POST') {
  try { if(!req.body?.action) throw new Error('Whole-list replacement is disabled'); applyB2BMutation(normalize(null),req.body); }
  catch(error:any) { return res.status(400).json({error:error.message}); }
 }
 try {
  const ref=doc(getOperationalDb(),'systemConfig','b2b');
  // Copy the old durable server document only when the named destination is absent.
  // Never import browser caches or replace an existing destination (even an empty one).
  const destination=await getDocFromServer(ref);
  if(!destination.exists()) {
   const legacy=await getDocFromServer(doc(getDb(),'systemConfig','b2b'));
   if(legacy.exists()) {
    await runTransaction(getOperationalDb(),async tx=>{
     if(!(await tx.get(ref)).exists())tx.set(ref,{payload:normalize(legacy.data().payload),migratedFrom:'default/systemConfig/b2b',updatedAt:new Date().toISOString()});
    });
   }
  }
  if(req.method === 'GET') { const snap=await getDocFromServer(ref);return res.status(200).json(normalize(snap.exists()?snap.data().payload:null)); }
  const next=await runTransaction(getOperationalDb(),async tx=>{
   const snap=await tx.get(ref);
   const value=applyB2BMutation(normalize(snap.exists()?snap.data().payload:null),req.body);
   tx.set(ref,{payload:value,updatedAt:new Date().toISOString()},{merge:true});return value;
  });
  return res.status(200).json({success:true,...next});
 } catch(error) { console.error('Central B2B persistence failed',error);return res.status(503).json({success:false,error:'เชื่อมต่อ Firestore ไม่สำเร็จ ยังยืนยันการบันทึกไม่ได้ กรุณารีเฟรชตรวจสอบก่อนลองอีกครั้ง'}); }
}
