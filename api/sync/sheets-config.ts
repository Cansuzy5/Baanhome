import { setCorsHeaders, getCentralConfig, setCentralConfig } from '../_db.ts';

const CONFIG_ID = 'sheetsConfig';
const FALLBACK_FILE = 'persistent_sheets_db_config.json';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const config = await getCentralConfig<any>(CONFIG_ID, FALLBACK_FILE, null);
      return res.status(200).json({ config });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to fetch sheets config' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { config } = req.body || {};
      await setCentralConfig(CONFIG_ID, FALLBACK_FILE, config);
      return res.status(200).json({ success: true, config });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to save sheets config' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
