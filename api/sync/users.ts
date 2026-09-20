import { setCorsHeaders, getCentralConfig, setCentralConfig, INITIAL_SHARED_USERS } from '../_db.js';

const CONFIG_ID = 'users';
const FALLBACK_FILE = 'persistent_users.json';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const users = await getCentralConfig<any[]>(CONFIG_ID, FALLBACK_FILE, INITIAL_SHARED_USERS);
      const userList = Array.isArray(users) && users.length > 0 ? users : INITIAL_SHARED_USERS;
      return res.status(200).json({ users: userList });
    } catch (e: any) {
      return res.status(200).json({ users: INITIAL_SHARED_USERS });
    }
  }

  if (req.method === 'POST') {
    try {
      const { users } = req.body || {};
      if (!Array.isArray(users)) {
        return res.status(400).json({ error: 'Invalid payload: users must be an array' });
      }
      await setCentralConfig(CONFIG_ID, FALLBACK_FILE, users);
      return res.status(200).json({ success: true, count: users.length });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to save users' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
