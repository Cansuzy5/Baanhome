import { sharedApi } from './sharedApi';
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
const firestoreDbId = (firebaseConfig as Record<string, any>).firestoreDatabaseId || 'ai-studio-1982e74e-9ff9-469a-9cec-64e98f787d0b';
export const db = getFirestore(app, firestoreDbId);
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
  try { if (localStorage.getItem(QUESTION_LOGS_STORAGE_KEY + '_before_shared_db') === null) localStorage.setItem(QUESTION_LOGS_STORAGE_KEY + '_before_shared_db', localStorage.getItem(QUESTION_LOGS_STORAGE_KEY) || '[]');
    localStorage.setItem(QUESTION_LOGS_STORAGE_KEY, JSON.stringify(logs)); } catch {}
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
  try { if (localStorage.getItem(UNANSWERED_STORAGE_KEY + '_before_shared_db') === null) localStorage.setItem(UNANSWERED_STORAGE_KEY + '_before_shared_db', localStorage.getItem(UNANSWERED_STORAGE_KEY) || '[]');
    localStorage.setItem(UNANSWERED_STORAGE_KEY, JSON.stringify(qs)); } catch {}
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

  // If daily read/write quota is exceeded, switch seamlessly to local storage without throwing fatal console error
  if (isQuotaExceededError(error)) {
    console.warn(`[Firestore Quota] Daily quota reached for ${operationType} on ${path}. Seamless fallback to local storage active.`);
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

// Log a new successful or unsuccessful question
async function mutateQuestion(body: unknown) {
  const result = await sharedApi('/api/sync/question-logs', body);
  if (!Array.isArray(result.logs)) throw new Error('ข้อมูลคำถามตอบกลับไม่ถูกต้อง');
  saveLocalQuestionLogs(result.logs);
  window.dispatchEvent(new Event('baanhome-questions-changed'));
}
export async function createQuestionLog(log: Omit<QuestionLog, 'feedback' | 'feedbackNote'>) {
  await mutateQuestion({ action: 'upsert', item: log });
}
export async function updateQuestionLogFeedback(id: string, feedback: FeedbackType, note?: string) {
  const data = await sharedApi('/api/sync/question-logs');
  const item = data.logs.find((log: QuestionLog) => log.id === id);
  if (!item) throw new Error('ไม่พบคำถามในฐานกลาง');
  await mutateQuestion({ action: 'upsert', item: { ...item, feedback, ...(note === undefined ? {} : { feedbackNote: note }) } });
}


// Log a new unanswered question
async function mutateUnanswered(body: unknown) {
  const result = await sharedApi('/api/sync/unanswered', body);
  saveLocalUnansweredQuestions(result.questions);
  window.dispatchEvent(new Event('baanhome-unanswered-changed'));
  window.dispatchEvent(new Event('baanhome-questions-changed'));
}
export async function createUnansweredQuestion(item: UnansweredQuestion) { await mutateUnanswered({ action: 'upsert', item }); }
export async function updateUnansweredStatus(id: string, status: 'pending' | 'assigned' | 'resolved', notes?: string) {
  const data = await sharedApi('/api/sync/unanswered');
  const item = data.questions.find((q: UnansweredQuestion) => q.id === id);
  if (!item) throw new Error('ไม่พบคำถามในฐานกลาง');
  await mutateUnanswered({ action: 'upsert', item: { ...item, status, ...(notes === undefined ? {} : { adminNotes: notes }) } });
}
export async function deleteUnansweredQuestion(id: string) { await mutateUnanswered({ action: 'delete', id }); }


export async function deleteQuestionLog(id: string) {
  await mutateQuestion({ action: 'delete', id });
}

export async function checkConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Ignore offline or quota checks
  }
}

export function subscribeQuestionLogs(callback: (logs: QuestionLog[]) => void) {
  let active = true, pending = false;
  const refresh = async () => {
    if (pending) return;
    pending = true;
    try {
      const data = await sharedApi('/api/sync/question-logs');
      if (!Array.isArray(data.logs)) throw new Error('ข้อมูลคำถามไม่ถูกต้อง');
      if (active) { saveLocalQuestionLogs(data.logs); callback(data.logs); }
    } catch (error) { console.warn('Question sync failed', error); }
    finally { pending = false; }
  };
  void refresh();
  const timer = setInterval(refresh, 15000);
  window.addEventListener('baanhome-questions-changed', refresh);
  return () => { active = false; clearInterval(timer); window.removeEventListener('baanhome-questions-changed', refresh); };
}

export function subscribeUnansweredQuestions(callback: (qs: UnansweredQuestion[]) => void) {
  let active = true, pending = false;
  const refresh = async () => {
    if (pending) return;
    pending = true;
    try { const data = await sharedApi('/api/sync/unanswered'); if (active) { saveLocalUnansweredQuestions(data.questions); callback(data.questions); } }
    catch (error) { console.warn('Unanswered sync failed', error); }
    finally { pending = false; }
  };
  void refresh();
  const timer = setInterval(refresh, 15000);
  window.addEventListener('baanhome-unanswered-changed', refresh);
  return () => { active = false; clearInterval(timer); window.removeEventListener('baanhome-unanswered-changed', refresh); };
}
