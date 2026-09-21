import React, { useState } from 'react';
import { X, Plus, Phone, Power, Pencil } from 'lucide-react';
import { B2BCoordinator, UserRole } from '../types';
import { saveB2BCoordinator, setB2BCoordinatorActive } from '../utils/b2bCoordinatorService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  coordinators: B2BCoordinator[];
  role: UserRole;
}

export const B2BCoordinatorManagerModal: React.FC<Props> = ({ isOpen, onClose, coordinators, role }) => {
  const [editing, setEditing] = useState<B2BCoordinator | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const canManage = role === 'Operator' || role === 'Administrator';

  if (!isOpen) return null;

  const startEdit = (item?: B2BCoordinator) => {
    setEditing(item || null);
    setName(item?.name || '');
    setPhone(item?.phone || '');
    setError('');
  };

  const save = async () => {
    if (!name.trim()) return;
    try {
      await saveB2BCoordinator({
        id: editing?.id || `bhc_${Date.now()}`,
        name,
        phone,
        active: editing?.active ?? true,
        createdAt: editing?.createdAt,
      }, role);
      startEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="bg-[#1B3E2D] text-white p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold">จัดการรายชื่อผู้ประสานงานบ้านโฮม</h3>
            <p className="text-xs text-white/70">รายชื่อนี้แยกจากบัญชีเข้าสู่ระบบ และใช้ร่วมกันทุกเครื่อง</p>
          </div>
          <button onClick={onClose} className="p-2"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] gap-2">
            <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="ชื่อผู้ประสานงานบ้านโฮม" className="px-3 py-2 rounded-xl border border-[#D5E2D2] text-sm" />
            <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="เบอร์ติดต่อ" className="px-3 py-2 rounded-xl border border-[#D5E2D2] text-sm" />
            <button disabled={!canManage} onClick={save} className="px-4 py-2 rounded-xl bg-[#1B3E2D] text-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50">
              <Plus className="w-4 h-4" /> {editing ? 'บันทึก' : 'เพิ่ม'}
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {coordinators.length === 0 && <div className="text-xs text-[#789686] text-center py-6">ยังไม่มีรายชื่อ</div>}
            {coordinators.map((item)=>(
              <div key={item.id} className="p-3 rounded-2xl border border-[#E2EAE0] flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-sm text-[#183A28]">{item.name}</div>
                  <div className="text-xs text-[#789686] flex items-center gap-1"><Phone className="w-3 h-3"/>{item.phone || 'ยังไม่ระบุ'} · {item.active ? 'ใช้งาน' : 'ปิดใช้งาน'}</div>
                </div>
                <div className="flex gap-1">
                  <button disabled={!canManage} onClick={()=>startEdit(item)} className="p-2 rounded-lg hover:bg-[#EEF5EC] disabled:opacity-40"><Pencil className="w-4 h-4"/></button>
                  <button disabled={!canManage} onClick={()=>setB2BCoordinatorActive(item.id,!item.active,role)} className={`p-2 rounded-lg disabled:opacity-40 ${item.active?'text-red-500 hover:bg-red-50':'text-emerald-600 hover:bg-emerald-50'}`} title={item.active?'ปิดใช้งาน':'เปิดใช้งาน'}>
                    <Power className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
