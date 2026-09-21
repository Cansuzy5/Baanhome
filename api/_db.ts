import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, Firestore } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Firebase configuration for Baanhome Resort centralized database
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

// Reuse Firestore instance across serverless invocations
let dbInstance: Firestore | null = null;

export function getDb(): Firestore {
  if (!dbInstance) {
    try {
      const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
    } catch (e) {
      throw e;
    }
  }
  return dbInstance as Firestore;
}

// All current routes share the named database already selected on main.
export function getOperationalDb(): Firestore { return getDb(); }
// Only the guarded, non-destructive legacy B2B copy uses the default database.
export function getLegacyDb(): Firestore {
 const app=getApps().length>0?getApp():initializeApp(firebaseConfig);
 return getFirestore(app);
}

export const db: Firestore = getDb();

export { setCorsHeaders } from '../lib/cors.js';

// In-memory fallback cache across warm serverless functions
const memoryCache = new Map<string, any>();

function getLocalFilePath(fileName: string): string {
  // Check if project-level data/ exists and is writable
  const localDataDir = path.join(process.cwd(), 'data');
  if (fs.existsSync(localDataDir)) {
    return path.join(localDataDir, fileName);
  }
  // On Vercel serverless functions, /tmp is writable
  const tmpDir = path.join('/tmp', 'data');
  if (!fs.existsSync(tmpDir)) {
    try {
      fs.mkdirSync(tmpDir, { recursive: true });
    } catch (e) {
      // ignore
    }
  }
  return path.join(tmpDir, fileName);
}

export function readLocalFallback<T>(fileName: string, defaultValue: T): T {
  if (memoryCache.has(fileName)) {
    return memoryCache.get(fileName) as T;
  }
  try {
    const filePath = getLocalFilePath(fileName);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed !== undefined && parsed !== null) {
        memoryCache.set(fileName, parsed);
        return parsed as T;
      }
    }
  } catch (e) {
    // ignore
  }
  return defaultValue;
}

export function writeLocalFallback<T>(fileName: string, data: T): void {
  memoryCache.set(fileName, data);
  try {
    const filePath = getLocalFilePath(fileName);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    // If cwd is read-only (e.g. Vercel), try /tmp directly
    try {
      const tmpPath = path.join('/tmp', 'data', fileName);
      const tmpDir = path.dirname(tmpPath);
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (tmpErr) {
      // Memory cache is already updated
    }
  }
}

export async function getCentralConfig<T>(configId: string, fallbackFileName: string, defaultValue: T): Promise<T> {
  try {
    const database = getDb();
    if (database) {
      const snap = await getDoc(doc(database, 'systemConfig', configId));
      if (snap && snap.exists()) {
        const data = snap.data();
        if (data && 'payload' in data) {
          writeLocalFallback(fallbackFileName, data.payload);
          return data.payload as T;
        }
      }
    }
  } catch (err) {
    // In case of Firestore read issues or quota limitations, fall back gracefully to local/memory
  }
  return readLocalFallback(fallbackFileName, defaultValue);
}

export async function setCentralConfig<T>(configId: string, fallbackFileName: string, payload: T): Promise<void> {
  writeLocalFallback(fallbackFileName, payload);
  try {
    const database = getDb();
    if (database) {
      await setDoc(doc(database, 'systemConfig', configId), {
        payload,
        updatedAt: new Date().toISOString()
      });
    }
  } catch (err) {
    // ignore
  }
}

export const INITIAL_SHARED_USERS = [
  {
    id: 'usr_best',
    username: 'best',
    name: 'best',
    department: 'ช่างและปฏิบัติการ (Engineering & Operations)',
    role: 'Administrator',
    status: 'active',
    avatar: '🧑🏻‍💼',
    passwordHash: 'e32e70df43cf2288920a3555652178fc758c60a5e686e0615e95cb18df617c4e',
    createdAt: '2026-09-20 14:50:00',
    lastLoginAt: null,
  },
  {
    id: 'usr_candy',
    username: 'cansuzy3',
    name: 'Candy',
    department: 'ช่างและปฏิบัติการ (Engineering & Operations)',
    role: 'Administrator',
    status: 'active',
    avatar: '🧑🏻‍💼',
    passwordHash: 'd93028673bae1ae8f8296bf87a2d05d9407ba69427da36d7a073e6e6c06c786d',
    createdAt: '2026-09-19 14:48:00',
    lastLoginAt: '2026-09-19 14:49:15',
  },
  {
    id: 'usr_admin',
    username: 'admin',
    name: 'คุณผู้จัดการศิริชัย (Admin)',
    department: 'ฝ่ายขายและการตลาด (Sales & MICE)',
    role: 'Administrator',
    status: 'active',
    avatar: '👨🏻‍💼',
    passwordHash: '9dbcd8e2eef014a070e1713d9657b98d287ef3e3d937107db71fb3426e0e2c81',
    createdAt: '2026-03-01 08:00:00',
    lastLoginAt: '2026-09-19 14:49:15',
  }
];
