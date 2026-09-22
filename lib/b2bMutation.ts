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

function normalizeLeadName(value: unknown): string {
  return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('th-TH');
}

function appointmentBelongsToLead(current: B2BData, appointment: any, lead: any): boolean {
  if (appointment?.leadId) {
    if (appointment.leadId === lead.id) return true;
    const referencedLeadStillExists = current.leads.some(item => item?.id === appointment.leadId);
    if (referencedLeadStillExists) return false;
  }

  if (normalizeLeadName(appointment?.leadName) !== normalizeLeadName(lead?.name)) return false;
  const sameNameLeads = current.leads.filter(
    item => normalizeLeadName(item?.name) === normalizeLeadName(lead?.name)
  );
  if (sameNameLeads.length <= 1) return true;

  const appointmentPhone = String(appointment?.phone || '').replace(/\D/g, '');
  const leadPhone = String(lead?.phone || '').replace(/\D/g, '');
  return Boolean(appointmentPhone && leadPhone && appointmentPhone === leadPhone);
}

export function applyB2BMutation(current: B2BData, body: any): B2BData {
  if (!body || typeof body !== 'object') throw new Error('Invalid B2B request');

  // Calendar close action: make the clicked appointment the authoritative anchor.
  // This avoids stale lead links/revisions in old test data and makes the operation
  // idempotent: clicking close again on an already archived appointment will not
  // create another sales-closure record.
  if (body.action === 'closeCycleFromAppointment') {
    if (
      typeof body.appointmentId !== 'string' ||
      !body.appointmentId ||
      typeof body.closedAt !== 'string' ||
      !body.closedAt ||
      typeof body.closureId !== 'string' ||
      !body.closureId ||
      !['success', 'unsuccessful'].includes(body.outcome)
    ) {
      throw new Error('Missing close-cycle appointment data');
    }

    // api/sync/b2b.ts performs a lightweight dry validation against an empty set
    // before the Firestore transaction. The real transaction below will have data.
    if (current.appointments.length === 0 && current.leads.length === 0) return current;

    const sourceAppointment = current.appointments.find(item => item.id === body.appointmentId);
    if (!sourceAppointment) throw new Error('ไม่พบนัดหมายที่ต้องการปิดดีล');

    if (sourceAppointment.salesCycleClosedAt) {
      return current;
    }

    let lead = current.leads.find(item => sourceAppointment.leadId && item.id === sourceAppointment.leadId);
    if (
      lead &&
      sourceAppointment.leadName &&
      normalizeLeadName(lead.name) !== normalizeLeadName(sourceAppointment.leadName)
    ) {
      lead = undefined;
    }

    if (!lead) {
      const sameName = current.leads.filter(
        item => normalizeLeadName(item?.name) === normalizeLeadName(sourceAppointment.leadName)
      );
      if (sameName.length === 1) {
        lead = sameName[0];
      } else {
        const sourcePhone = String(sourceAppointment.phone || '').replace(/\D/g, '');
        if (sourcePhone) {
          lead = sameName.find(
            item => String(item?.phone || '').replace(/\D/g, '') === sourcePhone
          );
        }
      }
    }

    if (!lead) throw new Error('ไม่พบหน่วยงานที่ผูกกับนัดหมายนี้');

    const currentStage =
      lead.pipelineStage === 'เข้าพบแล้ว'
        ? 'ติดตามต่อ'
        : (lead.pipelineStage || lead.contactStatus || 'ยังไม่ติดต่อ');

    const closure = {
      id: body.closureId,
      outcome: body.outcome,
      closedAt: body.closedAt,
      closedById: body.actorId || '',
      closedByName: body.actorName || '',
      previousStage: currentStage,
    };

    const updatedLead = {
      ...lead,
      pipelineStage: 'ยังไม่ติดต่อ',
      contactStatus: 'ยังไม่ติดต่อ',
      appointmentDate: undefined,
      appointmentTime: undefined,
      salesClosures: [...(Array.isArray(lead.salesClosures) ? lead.salesClosures : []), closure],
      updatedAt: body.closedAt,
      history: [
        {
          id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: body.closedAt,
          actorId: body.actorId || '',
          actorName: body.actorName || '',
          action: body.outcome === 'success' ? 'ปิดการขายสำเร็จ' : 'ปิดการขายไม่สำเร็จ',
          changes: [
            `ผลรอบการขาย: ${body.outcome === 'success' ? 'ปิดการขาย' : 'ปิดการขายไม่สำเร็จ'}`,
            `สถานะก่อนปิดรอบ: "${currentStage}"`,
            'เริ่มวงจรใหม่: สถานะปัจจุบัน → "ยังไม่ติดต่อ"',
          ],
        },
        ...(Array.isArray(lead.history) ? lead.history : []),
      ].slice(0, 100),
    };

    const leads = upsert(current.leads, updatedLead, lead._revision);
    const appointments = current.appointments.map(appointment => {
      const sameCycleLead =
        appointment.id === sourceAppointment.id ||
        appointmentBelongsToLead(current, appointment, lead);

      if (!sameCycleLead || appointment.salesCycleClosedAt) return appointment;

      return {
        ...appointment,
        leadId: lead.id,
        leadName: lead.name,
        salesCycleClosedAt: body.closedAt,
        salesCycleClosureId: body.closureId,
        salesCycleOutcome: body.outcome,
        _revision: Number(appointment._revision || 0) + 1,
      };
    });

    return { leads, appointments };
  }

  // Closing a sales cycle preserves every appointment and its history.
  // Any appointment for this organization that has not already been archived
  // belongs to the cycle being closed, regardless of whether it was completed,
  // cancelled, missed, or still scheduled.
  if (body.action === 'closeCycle') {
    if (
      !body.lead ||
      typeof body.closedAt !== 'string' ||
      !body.closedAt ||
      typeof body.closureId !== 'string' ||
      !body.closureId ||
      !['success', 'unsuccessful'].includes(body.outcome)
    ) {
      throw new Error('Missing close-cycle data');
    }
    const leads = upsert(current.leads, body.lead, body.expectedLeadRevision);
    const appointments = current.appointments.map(appointment => {
      const isSourceAppointment =
        typeof body.sourceAppointmentId === 'string' &&
        body.sourceAppointmentId &&
        appointment.id === body.sourceAppointmentId;
      const belongsToLead =
        isSourceAppointment ||
        appointmentBelongsToLead(current, appointment, body.lead);

      if (!belongsToLead || appointment.salesCycleClosedAt) return appointment;

      return {
        ...appointment,
        // The selected calendar appointment is authoritative for this close action.
        // Repair its organization link and archive the rest of the same current cycle.
        leadId: body.lead.id,
        leadName: body.lead.name,
        salesCycleClosedAt: body.closedAt,
        salesCycleClosureId: body.closureId,
        salesCycleOutcome: body.outcome,
        _revision: Number(appointment._revision || 0) + 1,
      };
    });
    return { leads, appointments };
  }

  // Admin-only UI calls this through the service after removing one archived
  // closure from the lead. Clear only appointment markers belonging to that
  // exact round so other historical rounds remain untouched.
  if (body.action === 'deleteClosure') {
    if (!body.lead || typeof body.closureId !== 'string' || !body.closureId) {
      throw new Error('Missing delete-closure data');
    }
    const leads = upsert(current.leads, body.lead, body.expectedLeadRevision);
    const appointments = current.appointments.map(appointment => {
      const sameClosure =
        appointment.salesCycleClosureId === body.closureId ||
        (!appointment.salesCycleClosureId &&
          body.closedAt &&
          appointment.salesCycleClosedAt === body.closedAt);
      if (!sameClosure) return appointment;

      const {
        salesCycleClosedAt,
        salesCycleClosureId,
        salesCycleOutcome,
        ...rest
      } = appointment;
      return {
        ...rest,
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
