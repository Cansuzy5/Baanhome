import { setCorsHeaders, getCentralConfig, setCentralConfig } from '../_db';

const CONFIG_ID = 'knowledge';
const FALLBACK_FILE = 'persistent_knowledge.json';
const DEFAULT_VALUE = { items: null, sheetUrl: '', lastSynced: null };

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const data = await getCentralConfig(CONFIG_ID, FALLBACK_FILE, DEFAULT_VALUE);
      return res.status(200).json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to fetch knowledge data' });
    }
  }

  if (req.method === 'POST') {
    try {
      const payload = req.body || {};
      await setCentralConfig(CONFIG_ID, FALLBACK_FILE, payload);
      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to save knowledge data' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
