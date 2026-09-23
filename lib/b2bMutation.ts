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
  if (existing?.salesCycleClosedAt) throw new B2BConflictError('นัดที่จบรอบแล้วเป็นประวัติ อ่านได้อย่างเดียว');
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

export function isB2BDeletion(body: any): boolean {
  return body?.action === 'delete' || body?.action === 'deleteClosure' ||
    (body?.action === 'workflow' && body.deleteAppointmentId !== undefined);
}

export function applyB2BMutation(current: B2BData, body: any, verifiedAdmin = false): B2BData {
  if (isB2BDeletion(body) && !verifiedAdmin) throw new Error('เฉพาะแอดมินที่ยืนยันตัวตนแล้วเท่านั้นที่ลบได้');
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

    const sourceAppointment = current.appointments.find(item => item.id === body.appointmentId);
    if (!sourceAppointment) throw new Error('ไม่พบนัดหมายที่ต้องการปิดดีล');

    if (sourceAppointment.salesCycleClosedAt) {
      if (sourceAppointment.salesCycleOutcome !== body.outcome || !sourceAppointment.salesCycleClosureId) {
        throw new Error('นัดนี้จบรอบแล้ว หรือข้อมูลประวัติไม่ครบ กรุณาตรวจสอบประวัติ');
      }
      return current;
    }

    if (sourceAppointment.status !== 'completed') {
      throw new Error('ต้องบันทึกเข้าพบแล้วก่อนปิดดีล');
    }
    const lead = sourceAppointment.leadId
      ? current.leads.find(item => item.id === sourceAppointment.leadId)
      : (() => {
          const matches = current.leads.filter(item => normalizeLeadName(item.name) === normalizeLeadName(sourceAppointment.leadName));
          return matches.length === 1 ? matches[0] : undefined;
        })();

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
      sourceAppointmentId: sourceAppointment.id,
    };

    const updatedLead = {
      ...lead,
      pipelineStage: 'ยังไม่ติดต่อ',
      contactStatus: 'ยังไม่ติดต่อ',

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
      ],
    };

    delete updatedLead.appointmentDate;
    delete updatedLead.appointmentTime;
    const leads = upsert(current.leads, updatedLead, lead._revision);
    const appointments = current.appointments.map(appointment => {
      if (appointment.id !== sourceAppointment.id) return appointment;

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

  // Compatibility entry point; all closures use the exact-appointment handler.
  if (body.action === 'closeCycle') {
    if (!body.sourceAppointmentId) throw new Error('กรุณาเลือกนัดที่เข้าพบแล้วเพื่อปิดรอบ');
    return applyB2BMutation(current, {
      ...body, action: 'closeCycleFromAppointment', appointmentId: body.sourceAppointmentId,
    });
  }

  // Removing a statistic must never reopen immutable appointment history.
  if (body.action === 'deleteClosure') {
    if (!body.lead || typeof body.closureId !== 'string' || !body.closureId) {
      throw new Error('Missing delete-closure data');
    }
    const leads = upsert(current.leads, body.lead, body.expectedLeadRevision);
    const appointments = current.appointments;
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

