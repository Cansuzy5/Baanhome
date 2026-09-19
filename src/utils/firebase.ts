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
  try {
    localStorage.setItem(QUESTION_LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    // ignore
  }
  try {
    fetch('/api/sync/question-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs }),
    }).catch(() => {});
  } catch (e) {}
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
  try {
    fetch('/api/sync/unanswered', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: qs }),
    }).catch(() => {});
  } catch (e) {}
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
export async function createQuestionLog(log: Omit<QuestionLog, 'feedback' | 'feedbackNote'>) {
  // Update local storage first (Optimistic / Offline fallback)
  const current = getLocalQuestionLogs();
  const existingIdx = current.findIndex(item => item.id === log.id);
  const newLogItem: QuestionLog = { ...log, feedback: undefined, feedbackNote: undefined };
  if (existingIdx >= 0) {
    current[existingIdx] = newLogItem;
  } else {
    current.unshift(newLogItem);
  }
  saveLocalQuestionLogs(current);

  const path = `questionLogs/${log.id}`;
  try {
    const data = {
      id: log.id,
      timestamp: log.timestamp,
      staffName: log.staffName,
      department: log.department,
      question: log.question,
      answerSummary: log.answerSummary,
      category: log.category,
      sourceDoc: log.sourceDoc,
      found: log.found,
      createdAt: serverTimestamp()
    };
    await setDoc(doc(db, 'questionLogs', log.id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Update feedback for an existing log
export async function updateQuestionLogFeedback(id: string, feedback: FeedbackType, note?: string) {
  const current = getLocalQuestionLogs();
  const item = current.find(l => l.id === id);
  if (item) {
    item.feedback = feedback;
    if (note !== undefined) item.feedbackNote = note;
    saveLocalQuestionLogs(current);
  }

  const path = `questionLogs/${id}`;
  try {
    const updates: any = { feedback };
    if (note !== undefined) {
      updates.feedbackNote = note;
    }
    await updateDoc(doc(db, 'questionLogs', id), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Log a new unanswered question
export async function createUnansweredQuestion(q: UnansweredQuestion) {
  const current = getLocalUnansweredQuestions();
  const existingIdx = current.findIndex(item => item.id === q.id);
  if (existingIdx >= 0) {
    current[existingIdx] = q;
  } else {
    current.unshift(q);
  }
  saveLocalUnansweredQuestions(current);

  const path = `unansweredQuestions/${q.id}`;
  try {
    const data: any = {
      id: q.id,
      timestamp: q.timestamp,
      staffName: q.staffName,
      department: q.department,
      question: q.question,
      status: q.status,
      createdAt: serverTimestamp()
    };
    if (q.suggestedCategory) data.suggestedCategory = q.suggestedCategory;
    if (q.targetDoc) data.targetDoc = q.targetDoc;
    if (q.adminNotes) data.adminNotes = q.adminNotes;

    await setDoc(doc(db, 'unansweredQuestions', q.id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Update status of an unanswered question
export async function updateUnansweredStatus(id: string, status: 'pending' | 'assigned' | 'resolved', notes?: string) {
  const current = getLocalUnansweredQuestions();
  const item = current.find(q => q.id === id);
  if (item) {
    item.status = status;
    if (notes !== undefined) item.adminNotes = notes;
    saveLocalUnansweredQuestions(current);
  }

  const path = `unansweredQuestions/${id}`;
  try {
    const updates: any = { status };
    if (notes !== undefined) {
      updates.adminNotes = notes;
    }
    await updateDoc(doc(db, 'unansweredQuestions', id), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteUnansweredQuestion(id: string) {
  const current = getLocalUnansweredQuestions().filter(q => q.id !== id);
  saveLocalUnansweredQuestions(current);

  const path = `unansweredQuestions/${id}`;
  try {
    await deleteDoc(doc(db, 'unansweredQuestions', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteQuestionLog(id: string) {
  const current = getLocalQuestionLogs().filter(l => l.id !== id);
  saveLocalQuestionLogs(current);

  const path = `questionLogs/${id}`;
  try {
    await deleteDoc(doc(db, 'questionLogs', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function checkConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Ignore offline or quota checks
  }
}

export function subscribeQuestionLogs(callback: (logs: QuestionLog[]) => void) {
  // Feed local cache immediately to prevent blank / loading delay
  const localLogs = getLocalQuestionLogs();
  if (localLogs.length > 0) {
    callback(localLogs);
  }

  // Sync from backend server store
  fetch('/api/sync/question-logs')
    .then((res) => res.json())
    .then((data) => {
      if (data && Array.isArray(data.logs) && data.logs.length > 0) {
        localStorage.setItem(QUESTION_LOGS_STORAGE_KEY, JSON.stringify(data.logs));
        callback(data.logs);
      }
    })
    .catch(() => {});

  try {
    const q = query(collection(db, 'questionLogs'), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        const logs: QuestionLog[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          logs.push({
            id: data.id,
            timestamp: data.timestamp,
            staffName: data.staffName,
            department: data.department,
            question: data.question,
            answerSummary: data.answerSummary,
            category: data.category,
            sourceDoc: data.sourceDoc,
            found: data.found,
            feedback: data.feedback,
            feedbackNote: data.feedbackNote
          });
        });
        if (logs.length > 0) {
          saveLocalQuestionLogs(logs);
          callback(logs);
        }
      },
      (error) => {
        if (isQuotaExceededError(error)) {
          console.warn('[Firestore] Quota limit reached for daily reads. Using local storage fallback seamlessly.');
          const fallback = getLocalQuestionLogs();
          if (fallback.length > 0) callback(fallback);
          return;
        }
        handleFirestoreError(error, OperationType.GET, 'questionLogs');
      }
    );
  } catch (err) {
    if (!isQuotaExceededError(err)) {
      handleFirestoreError(err, OperationType.GET, 'questionLogs');
    }
    return () => {};
  }
}

export function subscribeUnansweredQuestions(callback: (qs: UnansweredQuestion[]) => void) {
  const localQs = getLocalUnansweredQuestions();
  if (localQs.length > 0) {
    callback(localQs);
  }

  // Sync from backend server store
  fetch('/api/sync/unanswered')
    .then((res) => res.json())
    .then((data) => {
      if (data && Array.isArray(data.questions) && data.questions.length > 0) {
        localStorage.setItem(UNANSWERED_STORAGE_KEY, JSON.stringify(data.questions));
        callback(data.questions);
      }
    })
    .catch(() => {});

  try {
    const q = query(collection(db, 'unansweredQuestions'), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        const qs: UnansweredQuestion[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          qs.push({
            id: data.id,
            timestamp: data.timestamp,
            staffName: data.staffName,
            department: data.department,
            question: data.question,
            status: data.status,
            suggestedCategory: data.suggestedCategory,
            targetDoc: data.targetDoc,
            adminNotes: data.adminNotes
          });
        });
        if (qs.length > 0) {
          saveLocalUnansweredQuestions(qs);
          callback(qs);
        }
      },
      (error) => {
        if (isQuotaExceededError(error)) {
          console.warn('[Firestore] Quota limit reached for daily reads. Using local storage fallback seamlessly.');
          const fallback = getLocalUnansweredQuestions();
          if (fallback.length > 0) callback(fallback);
          return;
        }
        handleFirestoreError(error, OperationType.GET, 'unansweredQuestions');
      }
    );
  } catch (err) {
    if (!isQuotaExceededError(err)) {
      handleFirestoreError(err, OperationType.GET, 'unansweredQuestions');
    }
    return () => {};
  }
}
