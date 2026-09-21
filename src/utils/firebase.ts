import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDocFromServer,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { QuestionLog, UnansweredQuestion, FeedbackType, KnowledgeCategory } from '../types';

const app = initializeApp(firebaseConfig);
const firestoreDbId = (firebaseConfig as Record<string, any>).firestoreDatabaseId;
export const db = firestoreDbId && firestoreDbId !== '(default)' ? getFirestore(app, firestoreDbId) : getFirestore(app);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

const QUESTION_LOGS_STORAGE_KEY = 'baanhome_question_logs';
const UNANSWERED_STORAGE_KEY = 'baanhome_unanswered_questions';

export function getLocalQuestionLogs(): QuestionLog[] {
  try {
    const raw = localStorage.getItem(QUESTION_LOGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    // ignore
  }
  return [];
}

export function saveLocalQuestionLogs(logs: QuestionLog[]) {
  try {
    localStorage.setItem(QUESTION_LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    // ignore
  }

}

export function getLocalUnansweredQuestions(): UnansweredQuestion[] {
  try {
    const raw = localStorage.getItem(UNANSWERED_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    // ignore
  }
  return [];
}

export function saveLocalUnansweredQuestions(qs: UnansweredQuestion[]) {
  try {
    localStorage.setItem(UNANSWERED_STORAGE_KEY, JSON.stringify(qs));
  } catch (e) {
    // ignore
  }

}

export function isQuotaExceededError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('Quota limit exceeded') ||
    msg.includes('resource-exhausted') ||
    msg.includes('quota metric') ||
    msg.includes('Free daily read units') ||
    msg.includes('429')
  );
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Report quota errors; local cache must never be treated as a successful write.
  if (isQuotaExceededError(error)) {
    console.warn(`[Firestore Quota] Daily quota reached for ${operationType} on ${path}. Central operation was not confirmed.`);
    return;
  }

  const isPermissionDenied =
    errorMessage.includes('Missing or insufficient permissions') ||
    errorMessage.includes('permission-denied') ||
    errorMessage.includes('PERMISSION_DENIED');

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };

  if (isPermissionDenied) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  } else {
    console.warn('Firestore Notice: ', errorMessage);
  }
}

function syncError(error:unknown):never {
 handleFirestoreError(error,OperationType.WRITE,null);
 window.dispatchEvent(new CustomEvent('baanhome-sync-error',{detail:'บันทึก Firestore ไม่สำเร็จ ยังยืนยันข้อมูลไม่ได้ กรุณาลองใหม่'}));throw error;
}
export async function createQuestionLog(log:Omit<QuestionLog,'feedback'|'feedbackNote'>) {
 try {await setDoc(doc(db,'questionLogs',log.id),{...JSON.parse(JSON.stringify(log)),createdAt:serverTimestamp()});}catch(error){syncError(error);}
}
export async function updateQuestionLogFeedback(id:string,feedback:FeedbackType,note?:string) {
 try {await updateDoc(doc(db,'questionLogs',id),{feedback,...(note!==undefined?{feedbackNote:note}:{})});}catch(error){syncError(error);}
}
export async function createUnansweredQuestion(q:UnansweredQuestion) {
 try {await setDoc(doc(db,'unansweredQuestions',q.id),{...JSON.parse(JSON.stringify(q)),createdAt:serverTimestamp()});}catch(error){syncError(error);}
}
export async function updateUnansweredStatus(id:string,status:'pending'|'assigned'|'resolved',notes?:string) {
 try {await updateDoc(doc(db,'unansweredQuestions',id),{status,...(notes!==undefined?{adminNotes:notes}:{})});}catch(error){syncError(error);}
}
export async function deleteUnansweredQuestion(id:string) {
 try {await deleteDoc(doc(db,'unansweredQuestions',id));}catch(error){syncError(error);}
}
export async function deleteQuestionLog(id:string) {
 try {await deleteDoc(doc(db,'questionLogs',id));}catch(error){syncError(error);}
}

export async function checkConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Ignore offline or quota checks
  }
}

function subscribeCentralCollection<T>(name:string,cache:(items:T[])=>void,callback:(items:T[])=>void) {
 return onSnapshot(collection(db,name),{includeMetadataChanges:true},snapshot=>{
  if(snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites)return;
  const items=snapshot.docs.map(d=>({...d.data(),id:d.id})).sort((a:any,b:any)=>String(b.timestamp||'').localeCompare(String(a.timestamp||''))) as T[];
  cache(items);callback(items);
 },error=>{handleFirestoreError(error,OperationType.LIST,name);window.dispatchEvent(new CustomEvent('baanhome-sync-error',{detail:'อ่านประวัติจาก Firestore ไม่สำเร็จ ข้อมูลอาจยังไม่ล่าสุด'}));});
}
export function subscribeQuestionLogs(callback:(logs:QuestionLog[])=>void) {return subscribeCentralCollection('questionLogs',saveLocalQuestionLogs,callback);}
export function subscribeUnansweredQuestions(callback:(items:UnansweredQuestion[])=>void) {return subscribeCentralCollection('unansweredQuestions',saveLocalUnansweredQuestions,callback);}
