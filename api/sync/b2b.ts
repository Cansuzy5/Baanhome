import {
  setCorsHeaders,
  getCentralConfig,
  setCentralConfig,
  readLocalFallback,
  writeLocalFallback,
} from '../_db.js';

const LEADS_FALLBACK_FILE = 'persistent_b2b_leads.json';
const APPOINTMENTS_FALLBACK_FILE = 'persistent_b2b_appointments.json';

interface B2BData {
  leads: any[];
  appointments: any[];
}

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const b2bData = await getCentralConfig<B2BData>('b2b', 'persistent_b2b.json', {
        leads: readLocalFallback<any[]>(LEADS_FALLBACK_FILE, []),
        appointments: readLocalFallback<any[]>(APPOINTMENTS_FALLBACK_FILE, []),
      });

      return res.status(200).json({
        leads: Array.isArray(b2bData.leads) ? b2bData.leads : [],
        appointments: Array.isArray(b2bData.appointments) ? b2bData.appointments : [],
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to fetch B2B data' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { leads, appointments } = req.body || {};

      // Get current data to allow partial updates
      const current = await getCentralConfig<B2BData>('b2b', 'persistent_b2b.json', {
        leads: readLocalFallback<any[]>(LEADS_FALLBACK_FILE, []),
        appointments: readLocalFallback<any[]>(APPOINTMENTS_FALLBACK_FILE, []),
      });

      const updatedLeads = Array.isArray(leads) ? leads : current.leads || [];
      const updatedAppointments = Array.isArray(appointments) ? appointments : current.appointments || [];

      // Save individual fallback files
      if (Array.isArray(leads)) {
        writeLocalFallback(LEADS_FALLBACK_FILE, leads);
      }
      if (Array.isArray(appointments)) {
        writeLocalFallback(APPOINTMENTS_FALLBACK_FILE, appointments);
      }

      // Save to centralized systemConfig
      await setCentralConfig<B2BData>('b2b', 'persistent_b2b.json', {
        leads: updatedLeads,
        appointments: updatedAppointments,
      });

      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to save B2B data' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
