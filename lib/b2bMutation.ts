export type B2BData = { leads: any[]; appointments: any[] };
export function applyB2BMutation(current: B2BData, body: any): B2BData {
  if (!body || typeof body !== 'object') throw new Error('Invalid B2B request');
  if (body.action !== undefined) {
    const key = body.collection;
    if (key !== 'leads' && key !== 'appointments') throw new Error('Invalid collection');
    if (body.action !== 'delete' && body.action !== 'upsert') throw new Error('Invalid action');
    const id = body.action === 'delete' ? body.id : body.item?.id;
    if (typeof id !== 'string' || !id.trim()) throw new Error('Missing record ID');
    const items = current[key].filter(item => item.id !== id);
    if (body.action === 'upsert') items.unshift(body.item);
    return { ...current, [key]: items };
  }
  if (!Array.isArray(body.leads) && !Array.isArray(body.appointments)) throw new Error('Missing B2B data');
  return {
    leads: Array.isArray(body.leads) ? body.leads : current.leads,
    appointments: Array.isArray(body.appointments) ? body.appointments : current.appointments,
  };
}
