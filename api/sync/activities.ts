import { setCorsHeaders, getCentralConfig, setCentralConfig } from '../_db.ts';

const CONFIG_ID = 'activities';
const FALLBACK_FILE = 'persistent_activities.json';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const activities = await getCentralConfig<any[]>(CONFIG_ID, FALLBACK_FILE, []);
      return res.status(200).json({ activities: Array.isArray(activities) ? activities : [] });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to fetch activities' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { activity } = req.body || {};
      if (activity && activity.id) {
        const existing = await getCentralConfig<any[]>(CONFIG_ID, FALLBACK_FILE, []);
        const updated = [activity, ...existing.filter((a) => a.id !== activity.id)].slice(0, 300);
        await setCentralConfig(CONFIG_ID, FALLBACK_FILE, updated);
        return res.status(200).json({ success: true });
      }
      return res.status(400).json({ error: 'Invalid activity object' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to save activity' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
