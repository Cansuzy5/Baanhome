export type B2BData = { leads: any[]; appointments: any[] };

export class B2BConflictError extends Error {
  status = 409;
  constructor(message = 'ข้อมูลรายการนี้ถูกแก้ไขจากอีกเครื่อง กรุณารีเฟรชแล้วลองอีกครั้ง') {
    super(message);
    this.name = 'B2BConflictError';
  }
}

function upsert(items: any[], item: any, expectedRevision?: number): any[] {
  if (!item || typeof item.id !== 'string' || !item.id.trim()) throw new Error('Missing record ID');

  const existing = items.find(current => current.id === item.id);
  const currentRevision = Number(existing?._revision || 0);
  if (
    existing &&
    expectedRevision !== undefined &&
    Number(expectedRevision) !== currentRevision
  ) {
    throw new B2BConflictError();
  }

  const saved = { ...item, _revision: currentRevision + 1 };
  return [saved, ...items.filter(current => current.id !== item.id)];
}

function deleteById(items: any[], id: unknown, expectedRevision?: number): any[] {
  if (typeof id !== 'string' || !id.trim()) throw new Error('Missing record ID');
  const existing = items.find(current => current.id === id);
  if (
    existing &&
    expectedRevision !== undefined &&
    Number(expectedRevision) !== Number(existing?._revision || 0)
  ) {
    throw new B2BConflictError();
  }
  return items.filter(current => current.id !== id);
}

export function applyB2BMutation(current: B2BData, body: any): B2BData {
  if (!body || typeof body !== 'object') throw new Error('Invalid B2B request');

  // Closing a sales cycle preserves every appointment and its history, while
  // marking still-scheduled appointments as belonging to the closed cycle.
  if (body.action === 'closeCycle') {
    if (!body.lead || typeof body.closedAt !== 'string' || !body.closedAt) {
      throw new Error('Missing close-cycle data');
    }
    const leads = upsert(current.leads, body.lead, body.expectedLeadRevision);
    const appointments = current.appointments.map(appointment => {
      const belongsToLead = appointment.leadId
        ? appointment.leadId === body.lead.id
        : appointment.leadName === body.lead.name;
      if (
        !belongsToLead ||
        appointment.status !== 'scheduled' ||
        appointment.salesCycleClosedAt
      ) {
        return appointment;
      }
      return {
        ...appointment,
        salesCycleClosedAt: body.closedAt,
        _revision: Number(appointment._revision || 0) + 1,
      };
    });
    return { leads, appointments };
  }

  // One transaction can update an organization and one appointment together.
  if (body.action === 'workflow') {
    let leads = current.leads;
    let appointments = current.appointments;

    if (body.lead !== undefined) {
      leads = upsert(leads, body.lead, body.expectedLeadRevision);
    }
    if (body.appointment !== undefined) {
      appointments = upsert(appointments, body.appointment, body.expectedAppointmentRevision);
    }
    if (body.deleteAppointmentId !== undefined) {
      appointments = deleteById(
        appointments,
        body.deleteAppointmentId,
        body.expectedAppointmentRevision
      );
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

    if (body.action === 'delete') {
      return {
        ...current,
        [key]: deleteById(current[key], body.id, body.expectedRevision),
      };
    }

    return {
      ...current,
      [key]: upsert(current[key], body.item, body.expectedRevision),
    };
  }

  if (!Array.isArray(body.leads) && !Array.isArray(body.appointments)) throw new Error('Missing B2B data');
  return {
    leads: Array.isArray(body.leads) ? body.leads : current.leads,
    appointments: Array.isArray(body.appointments) ? body.appointments : current.appointments,
  };
}
