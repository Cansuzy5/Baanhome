export type B2BData = { leads: any[]; appointments: any[] };

function upsert(items: any[], item: any): any[] {
  if (!item || typeof item.id !== 'string' || !item.id.trim()) throw new Error('Missing record ID');
  return [item, ...items.filter(existing => existing.id !== item.id)];
}

export function applyB2BMutation(current: B2BData, body: any): B2BData {
  if (!body || typeof body !== 'object') throw new Error('Invalid B2B request');

  // One atomic workflow request can update the organization and appointment
  // together, preventing half-saved pipeline/calendar states.
  if (body.action === 'workflow') {
    let leads = current.leads;
    let appointments = current.appointments;

    if (body.lead !== undefined) leads = upsert(leads, body.lead);
    if (body.appointment !== undefined) appointments = upsert(appointments, body.appointment);

    if (body.deleteAppointmentId !== undefined) {
      if (typeof body.deleteAppointmentId !== 'string' || !body.deleteAppointmentId.trim()) {
        throw new Error('Missing appointment ID');
      }
      appointments = appointments.filter(item => item.id !== body.deleteAppointmentId);
    }

    if (body.lead === undefined && body.appointment === undefined && body.deleteAppointmentId === undefined) {
      throw new Error('Missing workflow data');
    }
    return { leads, appointments };
  }

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
