import { setCorsHeaders, getCentralConfig, setCentralConfig } from '../_db';

const CONFIG_ID = 'questionLogs';
const FALLBACK_FILE = 'persistent_question_logs.json';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const logs = await getCentralConfig<any[]>(CONFIG_ID, FALLBACK_FILE, []);
      return res.status(200).json({ logs: Array.isArray(logs) ? logs : [] });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to fetch question logs' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { logs } = req.body || {};
      if (!Array.isArray(logs)) {
        return res.status(400).json({ error: 'Invalid payload: logs must be an array' });
      }
      await setCentralConfig(CONFIG_ID, FALLBACK_FILE, logs);
      return res.status(200).json({ success: true, count: logs.length });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to save question logs' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
