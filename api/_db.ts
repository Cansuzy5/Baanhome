import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Firebase configuration for Baanhome Resort centralized database
const firebaseConfig = {
  projectId: "gen-lang-client-0051881339",
  appId: "1:236671287595:web:68c9cbe1ff5a917238456e",
  apiKey: "AIzaSyCuoP2tvd2nJC-3u4OYCwnck72mMNUyOKc",
  authDomain: "gen-lang-client-0051881339.firebaseapp.com",
  storageBucket: "gen-lang-client-0051881339.firebasestorage.app",
  messagingSenderId: "236671287595",
  firestoreDatabaseId: "ai-studio-1982e74e-9ff9-469a-9cec-64e98f787d0b"
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export function setCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

function getLocalFilePath(fileName: string): string {
  // Check if project-level data/ exists
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
  try {
    const filePath = getLocalFilePath(fileName);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed !== undefined && parsed !== null) {
        return parsed as T;
      }
    }
  } catch (e) {
    // ignore
  }
  return defaultValue;
}

export function writeLocalFallback<T>(fileName: string, data: T): void {
  try {
    const filePath = getLocalFilePath(fileName);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    // ignore
  }
}

export async function getCentralConfig<T>(configId: string, fallbackFileName: string, defaultValue: T): Promise<T> {
  try {
    const snap = await getDoc(doc(db, 'systemConfig', configId));
    if (snap.exists()) {
      const data = snap.data();
      if (data && 'payload' in data) {
        writeLocalFallback(fallbackFileName, data.payload);
        return data.payload as T;
      }
    }
  } catch (err) {
    // In case of Firestore read issues or quota limitations, fall back gracefully
  }
  return readLocalFallback(fallbackFileName, defaultValue);
}

export async function setCentralConfig<T>(configId: string, fallbackFileName: string, payload: T): Promise<void> {
  writeLocalFallback(fallbackFileName, payload);
  try {
    await setDoc(doc(db, 'systemConfig', configId), {
      payload,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    // ignore
  }
}

export const INITIAL_SHARED_USERS = [
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
