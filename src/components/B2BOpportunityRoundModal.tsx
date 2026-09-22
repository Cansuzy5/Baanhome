import React, { useMemo, useState } from 'react';
import { X, Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { B2BLead, B2BOpportunityRound } from '../types';
import { localDateKey } from '../utils/dateUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lead: B2BLead;
  isAdmin: boolean;
  onCreate: (name: string, startDate: string, notes: string) => Promise<boolean>;
  onEdit: (roundId: string, name: string, startDate: string, notes: string) => Promise<boolean>;
  onDelete: (roundId: string) => Promise<boolean>;
  onSetActive: (roundId: string) => Promise<boolean>;
}

export const B2BOpportunityRoundModal: React.FC<Props> = ({
  isOpen, onClose, lead, isAdmin, onCreate, onEdit, onDelete, onSetActive,
}) => {
  const rounds = useMemo(
    () => [...(lead.opportunityRounds || [])].sort((a,b) => b.sequence - a.sequence),
    [lead.opportunityRounds]
  );
  const [editing, setEditing] = useState<B2BOpportunityRound | null>(null);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(localDateKey());
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditing(null);
    setName('');
    setStartDate(localDateKey());
    setNotes('');
  };

  const beginEdit = (round: B2BOpportunityRound) => {
    setEditing(round);
    setName(round.name);
    setStartDate(round.startDate);
    setNotes(round.notes || '');
  };

  const submit = async () => {
    if (!name.trim() || !startDate || busy) return;
    setBusy(true);
    try {
      const ok = editing
        ? await onEdit(editing.id, name.trim(), startDate, notes.trim())
        : await onCreate(name.trim(), startDate, notes.trim());
      if (ok) resetForm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white border border-[#DDE7DA] shadow-2xl">
        <div className="sticky top-0 z-10 bg-[#1B3E2D] text-white px-5 py-4 flex items-center justify-between">
          <div>
            <div className="font-bold">รอบงาน / Opportunity</div>
            <div className="text-xs text-white/70">{lead.name}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-2xl bg-[#F7FAF6] border border-[#E0E8DE] p-4 space-y-3">
            <div className="text-xs font-bold text-[#315A43]">{editing ? 'แก้ไขรอบงาน' : 'เปิดรอบงานใหม่'}</div>
            <label className="block space-y-1">
              <span className="text-xs font-bold">ชื่อรอบงาน *</span>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="เช่น งานสัมมนา ต.ค. 2569" className="w-full px-3 py-2 rounded-xl border"/>
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-bold">วันที่เริ่มรอบ *</span>
                <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border"/>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold">หมายเหตุ</span>
                <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="รายละเอียดสั้น ๆ" className="w-full px-3 py-2 rounded-xl border"/>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              {editing && <button onClick={resetForm} className="px-3 py-2 rounded-xl bg-gray-100 text-xs font-bold">ยกเลิกแก้ไข</button>}
              <button disabled={busy || !name.trim()} onClick={submit} className="px-4 py-2 rounded-xl bg-[#1B3E2D] text-white text-xs font-bold disabled:opacity-50">
                {editing ? 'บันทึกการแก้ไข' : '+ เปิดรอบงานใหม่'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-[#315A43]">รอบงานทั้งหมด ({rounds.length})</div>
            {rounds.length === 0 ? (
              <div className="text-xs text-[#789086] border border-dashed rounded-2xl p-5 text-center">ยังไม่มีรอบงาน</div>
            ) : rounds.map(round => {
              const active = lead.activeOpportunityRoundId === round.id;
              return (
                <div key={round.id} className={`rounded-2xl border p-3 ${active ? 'border-emerald-300 bg-emerald-50' : 'border-[#E2E9DF] bg-white'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm text-[#183A28]">รอบที่ {round.sequence}: {round.name}</strong>
                        {active && <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">รอบปัจจุบัน</span>}
                      </div>
                      <div className="text-[11px] text-[#718579] mt-1">เริ่ม {round.startDate}{round.notes ? ` · ${round.notes}` : ''}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!active && <button disabled={busy} onClick={()=>onSetActive(round.id)} className="px-2 py-1 rounded-lg bg-[#EEF5EC] text-[#24563B] text-[10px] font-bold">ใช้รอบนี้</button>}
                      {isAdmin && <>
                        <button onClick={()=>beginEdit(round)} className="p-1.5 rounded-lg hover:bg-gray-100" title="แก้ไขรอบ"><Edit2 className="w-3.5 h-3.5"/></button>
                        <button onClick={()=>setConfirmDeleteId(round.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="ลบรอบ"><Trash2 className="w-3.5 h-3.5"/></button>
                      </>}
                    </div>
                  </div>
                  {round.updatedByName && <div className="text-[10px] text-[#8A9A91] mt-1">แก้ไขล่าสุดโดย {round.updatedByName}</div>}
                </div>
              );
            })}
          </div>

          {!isAdmin && <div className="text-[11px] text-[#718579] bg-[#F8FAF7] p-3 rounded-xl">Operator เปิดรอบใหม่และเลือกใช้งานได้ ส่วนการแก้ไข/ลบรอบย้อนหลังทำได้เฉพาะ Administrator</div>}
        </div>
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-3">
            <div className="font-bold text-[#1B3E2D]">ลบรอบงานนี้?</div>
            <div className="text-xs text-[#6F8377]">จะลบเฉพาะข้อมูลรอบงาน ไม่ลบองค์กร และไม่ลบนัดหมายเดิม เพื่อป้องกันข้อมูลสูญหาย</div>
            <div className="flex justify-end gap-2">
              <button onClick={()=>setConfirmDeleteId(null)} className="px-3 py-2 rounded-xl bg-gray-100 text-xs font-bold">ยกเลิก</button>
              <button disabled={busy} onClick={async()=>{setBusy(true); try { if(await onDelete(confirmDeleteId)) setConfirmDeleteId(null); } finally {setBusy(false);} }} className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold">ยืนยันลบรอบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
