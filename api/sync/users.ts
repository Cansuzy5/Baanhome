import { collection, getDocsFromServer } from 'firebase/firestore';
import { getOperationalDb, setCorsHeaders } from '../_db.js';
export default async function handler(req:any,res:any) {
 setCorsHeaders(res);res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS')return res.status(200).end();
 if(req.method!=='GET')return res.status(405).json({error:'Update individual appUsers records; bulk replacement is disabled'});
 try {const snapshot=await getDocsFromServer(collection(getOperationalDb(),'appUsers'));return res.status(200).json({users:snapshot.docs.map(d=>({...d.data(),id:d.id}))});}
 catch(error){console.error('Central users read failed',error);return res.status(503).json({error:'อ่านบัญชีจาก Firestore ไม่สำเร็จ'});}
}
