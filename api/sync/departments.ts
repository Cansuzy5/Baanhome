import { setCorsHeaders, getCentralConfig, setCentralConfig } from '../_db';

const CONFIG_ID = 'departments';
const FALLBACK_FILE = 'persistent_departments.json';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const depts = await getCentralConfig<any[]>(CONFIG_ID, FALLBACK_FILE, []);
      return res.status(200).json({ departments: Array.isArray(depts) ? depts : [] });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to fetch departments' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { departments } = req.body || {};
      if (!Array.isArray(departments)) {
        return res.status(400).json({ error: 'Invalid payload: departments must be an array' });
      }
      await setCentralConfig(CONFIG_ID, FALLBACK_FILE, departments);
      return res.status(200).json({ success: true, count: departments.length });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to save departments' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
