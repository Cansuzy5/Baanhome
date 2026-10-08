import { createHash } from 'node:crypto';
import { doc, getDocFromServer, runTransaction, setDoc } from 'firebase/firestore';
import { getDb, setCorsHeaders } from '../api/_db.js';
import { MAX_PARTS, PART_CHARS, validateValue } from './sharedContentProtocol.js';
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const ref = (id: string) => doc(getDb(), 'systemConfig', id);
const validHash = (s: any) => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s);
export function contentHandler(kind: 'knowledge' | 'customImages') {
  const root = ref(`${kind}_shared_v2`);
  return async (req: any, res: any) => {
    setCorsHeaders(res);
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') return res.status(200).end();
    try {
      if (req.method === 'GET') {
        if (req.query.part) {
          if (!validHash(req.query.part)) return res.status(400).json({ error: 'Invalid part' });
          const part = await getDocFromServer(ref(`shared_part_${req.query.part}`));
          if (!part.exists() || typeof part.data().text !== 'string' || hash(part.data().text) !== req.query.part) throw new Error('Shared content part missing or damaged');
          return res.json({ text: part.data().text });
        }
        if (req.query.protocol !== '2') return res.status(409).json({ error: 'กรุณารีเฟรชหน้าเพื่อใช้ระบบซิงค์รุ่นล่าสุด' });
        const snapshot = await getDocFromServer(root);
        const entries = snapshot.exists() ? snapshot.data().entries || {} : {};
        // Read the original document only from Firestore. Never report /tmp as shared data.
        const legacy = await getDocFromServer(ref(kind));
        return res.json({ entries, legacy: legacy.exists() ? legacy.data().payload : null });
      }
      if (req.method !== 'POST') return res.status(405).end();
      const body = req.body || {};
      if (body.action === 'stage') {
        if (typeof body.text !== 'string' || !body.text.length || body.text.length > PART_CHARS) return res.status(400).json({ error: 'Invalid part size' });
        const id = hash(body.text);
        await setDoc(ref(`shared_part_${id}`), { text: body.text });
        return res.json({ id });
      }
      if (body.action !== 'commit') return res.status(409).json({ error: 'กรุณารีเฟรชหน้าเพื่อใช้ระบบซิงค์รุ่นล่าสุด' });
      const { key, parts, expectedVersion } = body;
      if (typeof key !== 'string' || !Array.isArray(parts) || !parts.length || parts.length > MAX_PARTS || !parts.every(validHash) || !(expectedVersion === null || validHash(expectedVersion))) return res.status(400).json({ error: 'Invalid commit' });
      const texts = await Promise.all(parts.map(async (id: string) => {
        const part = await getDocFromServer(ref(`shared_part_${id}`));
        const text = part.data()?.text;
        if (typeof text !== 'string' || hash(text) !== id) throw new Error('Incomplete upload; previous data retained');
        return text;
      }));
      const value = JSON.parse(texts.join(''));
      validateValue(kind, key, value);
      const version = hash(JSON.stringify(parts));
      const entry = { key, parts, version };
      await runTransaction(getDb(), async tx => {
        const current = await tx.get(root);
        const entries = current.data()?.entries || {};
        const previous = entries[hash(key)]?.version || null;
        if (previous !== expectedVersion && previous !== version) {
          throw Object.assign(new Error('มีข้อมูลใหม่จากเครื่องอื่น กรุณาโหลดข้อมูลล่าสุดก่อนบันทึกอีกครั้ง'), { status: 409 });
        }
        tx.set(root, { entries: { ...entries, [hash(key)]: entry }, updatedAt: new Date().toISOString() });
      });
      const saved = await getDocFromServer(root);
      if (saved.data()?.entries?.[hash(key)]?.version !== version) throw new Error('ข้อมูลเปลี่ยนระหว่างบันทึก กรุณาโหลดใหม่เพื่อตรวจสอบ');
      return res.json({ success: true, entry });
    } catch (error: any) {
      console.error(`Shared ${kind} sync failed`, error.code || error.message);
      return res.status(error.status || 503).json({ error: error.message || 'บันทึกฐานข้อมูลกลางไม่สำเร็จ กรุณาลองใหม่' });
    }
  };
}
