import React, { useEffect, useMemo, useState } from 'react';
import { X, Building2, CheckCircle2, Plus, Tag } from 'lucide-react';
import { B2BLead, B2BCoordinator } from '../types';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lead: B2BLead) => void | Promise<void>;
  editLead?: B2BLead | null;
  coordinators?: B2BCoordinator[];
  onManageCoordinators?: () => void;
}

const ORG_TYPES = [
  'หน่วยงานราชการ / สำนักงานจังหวัด',
  'สถาบันการศึกษา / มหาวิทยาลัย / วิทยาลัย',
  'โรงพยาบาล / สาธารณสุข',
  'รัฐวิสาหกิจ',
  'ภาคเอกชน / หอการค้า / สภาอุตสาหกรรม',
  'องค์กรปกครองส่วนท้องถิ่น',
  'สมาคม / มูลนิธิ / ชมรม',
  'อื่นๆ',
];

const EVENT_TYPES = ['ประชุม', 'จัดเลี้ยง', 'สัมมนา'] as const;
const OFFER_OPTIONS = [
  'อาหารกลางวันคณะ',
  'อาหารบุฟเฟต์สำหรับคณะ',
  'อาหารว่าง',
  'เมนู Signature บ้านโฮม',
  'ห้องพัก รีสอร์ท',
  'ห้องพัก พูลวิลล่า',
] as const;
const PIPELINE_STAGES = ['ยังไม่ติดต่อ','ติดต่อแล้ว','นัดเข้าพบ','ติดตามต่อ','ส่งใบเสนอราคาแล้ว','ตกลง Partnership','ปิดการขาย'];

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen, onClose, onSave, editLead, coordinators = [], onManageCoordinators,
}) => {
  const oldEventText = editLead?.eventType || '';
  const legacyEvent = !EVENT_TYPES.includes(oldEventText as any)
    ? (editLead?.legacyEventTypeText || editLead?.format || editLead?.opportunity || '')
    : '';

  const oldOfferText = editLead?.offer || editLead?.proposalOffer || '';
  const rawOfferParts = oldOfferText.split(/[,/|]/).map(v=>v.trim()).filter(Boolean);
  const existingFeatured = editLead?.featuredOffers || [];
  const knownInitial = Array.from(new Set([
    ...existingFeatured.filter(v => OFFER_OPTIONS.includes(v as any)),
    ...OFFER_OPTIONS.filter((x)=>rawOfferParts.includes(x)),
  ]));
  const unmatchedOfferParts = [
    ...existingFeatured.filter(v => !OFFER_OPTIONS.includes(v as any)),
    ...rawOfferParts.filter(v => !OFFER_OPTIONS.includes(v as any)),
  ];
  const legacyOffer = editLead?.legacyOfferText || Array.from(new Set(unmatchedOfferParts)).join(', ');

  const [name,setName]=useState(editLead?.name||'');
  const [orgType,setOrgType]=useState(editLead?.orgType||editLead?.categoryType||'');
  const [contactPerson,setContactPerson]=useState(editLead?.contactPerson||'');
  const [contactPosition,setContactPosition]=useState(editLead?.contactPosition||'');
  const [phone,setPhone]=useState(editLead?.phone||'');
  const [email,setEmail]=useState(editLead?.email||editLead?.lineId||'');
  const [eventType,setEventType]=useState<B2BLead['eventType']>(EVENT_TYPES.includes(oldEventText as any)?oldEventText as any:'');
  const [attendees,setAttendees]=useState(editLead?.attendeesEstimate ? String(editLead.attendeesEstimate) : '');
  const [eventDate,setEventDate]=useState(editLead?.eventDate||'');
  const [requirements,setRequirements]=useState(editLead?.eventRequirements||legacyEvent);
  const [coordinatorId,setCoordinatorId]=useState(editLead?.baanHomeCoordinatorId||'');
  const [priority,setPriority]=useState<'A'|'B'|'C'>(editLead?.priority||'B');
  const [pipelineStage,setPipelineStage]=useState(editLead?.pipelineStage||editLead?.contactStatus||'ยังไม่ติดต่อ');
  const [reasons,setReasons]=useState(editLead?.reasonsToApproach||'');
  const [nextAction,setNextAction]=useState(editLead?.nextAction||'');
  const [offers,setOffers]=useState<string[]>(knownInitial);
  const [offerPicker,setOfferPicker]=useState('');
  const [offerDetails,setOfferDetails]=useState(editLead?.offerDetails||legacyOffer||'');
  const [saving,setSaving]=useState(false);

  // Rehydrate the form every time an existing organization is opened for editing.
  // This only changes UI state; it does not write to Firestore until the user presses Save.
  useEffect(() => {
    if (!isOpen) return;

    const currentEventText = editLead?.eventType || '';
    const currentLegacyEvent = !EVENT_TYPES.includes(currentEventText as any)
      ? (editLead?.legacyEventTypeText || editLead?.format || editLead?.opportunity || '')
      : '';

    const currentOfferText = editLead?.offer || editLead?.proposalOffer || '';
    const offerParts = currentOfferText.split(/[,/|]/).map(v => v.trim()).filter(Boolean);
    const featured = editLead?.featuredOffers || [];
    const known = Array.from(new Set([
      ...featured.filter(v => OFFER_OPTIONS.includes(v as any)),
      ...OFFER_OPTIONS.filter(v => offerParts.includes(v)),
    ]));
    const unmatched = [
      ...featured.filter(v => !OFFER_OPTIONS.includes(v as any)),
      ...offerParts.filter(v => !OFFER_OPTIONS.includes(v as any)),
    ];
    const currentLegacyOffer = editLead?.legacyOfferText || Array.from(new Set(unmatched)).join(', ');

    setName(editLead?.name || '');
    setOrgType(editLead?.orgType || editLead?.categoryType || '');
    setContactPerson(editLead?.contactPerson || '');
    setContactPosition(editLead?.contactPosition || '');
    setPhone(editLead?.phone || '');
    setEmail(editLead?.email || editLead?.lineId || '');
    setEventType(EVENT_TYPES.includes(currentEventText as any) ? currentEventText as any : '');
    setAttendees(editLead?.attendeesEstimate ? String(editLead.attendeesEstimate) : '');
    setEventDate(editLead?.eventDate || '');
    setRequirements(editLead?.eventRequirements || currentLegacyEvent);
    setCoordinatorId(editLead?.baanHomeCoordinatorId || '');
    setPriority(editLead?.priority || 'B');
    setPipelineStage(editLead?.pipelineStage || editLead?.contactStatus || 'ยังไม่ติดต่อ');
    setReasons(editLead?.reasonsToApproach || '');
    setNextAction(editLead?.nextAction || '');
    setOffers(known);
    setOfferPicker('');
    setOfferDetails(editLead?.offerDetails || currentLegacyOffer || '');
  }, [isOpen, editLead?.id]);

  const activeCoordinators=useMemo(()=>coordinators.filter(c=>c.active || c.id===coordinatorId),[coordinators,coordinatorId]);
  if(!isOpen) return null;

  const addOffer=(value:string)=>{
    if(value && !offers.includes(value)) setOffers([...offers,value]);
    setOfferPicker('');
  };

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!name.trim()||saving)return;
    const coordinator=coordinators.find(c=>c.id===coordinatorId);
    const lead:B2BLead={
      ...(editLead||{}),
      id:editLead?.id||`KH-${Date.now().toString().slice(-8)}`,
      name:name.trim(),
      priority,
      orgType:orgType||undefined,
      categoryType:orgType||editLead?.categoryType,
      contactPerson:contactPerson.trim(),
      contactPosition:contactPosition.trim(),
      phone:phone.trim(),
      email:email.trim(),
      eventType,
      attendeesEstimate:attendees?Number(attendees):undefined,
      eventDate:eventDate||undefined,
      eventRequirements:requirements.trim(),
      baanHomeCoordinatorId:coordinator?.id||undefined,
      baanHomeCoordinatorName:coordinator?.name||undefined,
      baanHomeCoordinatorPhone:coordinator?.phone||undefined,
      pipelineStage,
      contactStatus:pipelineStage,
      reasonsToApproach:reasons.trim(),
      nextAction:nextAction.trim(),
      featuredOffers:offers,
      offer:offers.join(', '),
      proposalOffer:offers.join(', '),
      offerDetails:offerDetails.trim(),
      legacyEventTypeText:editLead?.legacyEventTypeText || legacyEvent || undefined,
      legacyOfferText:editLead?.legacyOfferText || legacyOffer || undefined,
      isCustom:editLead?.isCustom ?? true,
      updatedAt:new Date().toISOString().split('T')[0],
    };
    setSaving(true);
    try{await onSave(lead);onClose();}finally{setSaving(false);}
  };

  const section=(title:string,children:React.ReactNode)=>(
    <section className="rounded-2xl bg-[#F8FAF7] p-4 space-y-3 border border-[#E8EEE6]">
      <h3 className="text-sm font-bold text-[#183A28] flex items-center gap-2">
        <span className="w-1.5 h-5 rounded-full bg-[#2E7D4E]" />{title}
      </h3>{children}
    </section>
  );

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm overflow-y-auto">
    <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full my-4 overflow-hidden max-h-[92vh] flex flex-col">
      <div className="bg-[#1B3E2D] text-white px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3"><Building2 className="w-5 h-5"/><div><h2 className="font-bold">{editLead?'แก้ไขข้อมูลลูกค้า / หน่วยงาน':'เพิ่มลูกค้า / หน่วยงาน'}</h2><p className="text-xs text-white/70">แยกข้อมูลลูกค้าและข้อมูลบ้านโฮมให้ชัดเจน</p></div></div>
        <button onClick={onClose} className="p-2"><X className="w-5 h-5"/></button>
      </div>

      {editLead && (
        <div className="px-5 py-3 bg-[#F4F8F2] border-b border-[#E5ECE2] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <div className="font-bold text-[#173826] text-sm">{editLead.name}</div>
            <div className="text-[#6B8274]">รหัส {editLead.id} · {editLead.orgType || editLead.categoryType || 'ยังไม่ระบุประเภท'}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-white border text-[#4F6B5A]">Priority {editLead.priority || 'B'}</span>
            <span className="px-2.5 py-1 rounded-full bg-white border text-[#4F6B5A]">{editLead.pipelineStage || editLead.contactStatus || 'ยังไม่ติดต่อ'}</span>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="overflow-y-auto flex-1 text-sm">
        <div className="p-4 sm:p-5 space-y-4">
        {section('1. ลูกค้า / หน่วยงาน',<>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1"><span className="text-xs font-bold">ชื่อหน่วยงาน *</span><input required value={name} onChange={e=>setName(e.target.value)} className="w-full px-3 py-2 rounded-xl border"/></label>
            <label className="space-y-1"><span className="text-xs font-bold">ประเภทหน่วยงาน</span><select value={orgType} onChange={e=>setOrgType(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white"><option value="">-- ยังไม่ระบุ --</option>{ORG_TYPES.map(v=><option key={v}>{v}</option>)}</select></label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1"><span className="text-xs font-bold">ชื่อผู้ติดต่อฝั่งลูกค้า</span><input value={contactPerson} onChange={e=>setContactPerson(e.target.value)} className="w-full px-3 py-2 rounded-xl border"/></label>
            <label className="space-y-1"><span className="text-xs font-bold">ตำแหน่งผู้ติดต่อฝั่งลูกค้า</span><input value={contactPosition} onChange={e=>setContactPosition(e.target.value)} className="w-full px-3 py-2 rounded-xl border"/></label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1"><span className="text-xs font-bold">เบอร์โทร</span><input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full px-3 py-2 rounded-xl border"/></label>
            <label className="space-y-1"><span className="text-xs font-bold">อีเมล / LINE</span><input value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-3 py-2 rounded-xl border"/></label>
          </div>
        </>)}

        {section('2. ความต้องการจัดงาน',<>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="space-y-1"><span className="text-xs font-bold">ประเภทงาน</span><select value={eventType} onChange={e=>setEventType(e.target.value as any)} className="w-full px-3 py-2 rounded-xl border bg-white"><option value="">-- เลือกประเภทงาน --</option>{EVENT_TYPES.map(v=><option key={v}>{v}</option>)}</select></label>
            <label className="space-y-1"><span className="text-xs font-bold">จำนวนผู้เข้าร่วมโดยประมาณ</span><input type="number" min="1" value={attendees} onChange={e=>setAttendees(e.target.value)} className="w-full px-3 py-2 rounded-xl border"/></label>
            <label className="space-y-1"><span className="text-xs font-bold">วันที่ลูกค้าคาดว่าจะจัดงาน</span><input type="date" value={eventDate} onChange={e=>setEventDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border"/></label>
          </div>
          <label className="space-y-1 block"><span className="text-xs font-bold">รายละเอียดความต้องการ</span><textarea rows={2} value={requirements} onChange={e=>setRequirements(e.target.value)} className="w-full px-3 py-2 rounded-xl border"/></label>
          {legacyEvent && <details className="text-[11px] text-[#7B6A45]"><summary className="cursor-pointer">ดูข้อมูลเดิมที่ยังจับคู่ไม่ได้</summary><div className="mt-1 pl-3">{legacyEvent}</div></details>}
        </>)}

        {section('3. ผู้รับผิดชอบบ้านโฮม',<>
          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
            <label className="space-y-1"><span className="text-xs font-bold">ผู้ประสานงานบ้านโฮม</span><select value={coordinatorId} onChange={e=>setCoordinatorId(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white"><option value="">-- ยังไม่ระบุ --</option>{activeCoordinators.map(c=><option key={c.id} value={c.id}>{c.name}{c.phone?` · ${c.phone}`:''}{!c.active?' (ปิดใช้งาน)':''}</option>)}</select></label>
            {onManageCoordinators&&<button type="button" onClick={onManageCoordinators} className="px-2 py-2 text-xs font-bold text-[#24563B] hover:underline">จัดการรายชื่อ</button>}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1"><span className="text-xs font-bold">ระดับความสำคัญ</span><select value={priority} onChange={e=>setPriority(e.target.value as any)} className="w-full px-3 py-2 rounded-xl border bg-white"><option value="A">A — ด่วน / โอกาสสูง</option><option value="B">B — ปานกลาง</option><option value="C">C — ทั่วไป</option></select></label>
            <label className="space-y-1"><span className="text-xs font-bold">สถานะการติดตาม</span><select value={pipelineStage} onChange={e=>setPipelineStage(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
              {!PIPELINE_STAGES.includes(pipelineStage) && pipelineStage && <option value={pipelineStage}>{pipelineStage} (ข้อมูลเดิม)</option>}
              {PIPELINE_STAGES.map(v=><option key={v}>{v}</option>)}
            </select></label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1"><span className="text-xs font-bold">เหตุผลที่ควรเข้าพบ</span><textarea rows={2} value={reasons} onChange={e=>setReasons(e.target.value)} className="w-full px-3 py-2 rounded-xl border"/></label>
            <label className="space-y-1"><span className="text-xs font-bold">ขั้นตอนถัดไป</span><textarea rows={2} value={nextAction} onChange={e=>setNextAction(e.target.value)} className="w-full px-3 py-2 rounded-xl border"/></label>
          </div>
        </>)}

        {section('4. ข้อเสนอจากบ้านโฮม',<>
          <div>
            <label className="text-xs font-bold">ข้อเสนอที่ควรชู</label>
            <select value={offerPicker} onChange={e=>addOffer(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border bg-white"><option value="">+ เลือกข้อเสนอ</option>{OFFER_OPTIONS.filter(v=>!offers.includes(v)).map(v=><option key={v}>{v}</option>)}</select>
          </div>
          <div className="flex flex-wrap gap-2">{offers.map(v=><button key={v} type="button" onClick={()=>setOffers(offers.filter(x=>x!==v))} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EAF4E7] text-[#24563B] text-xs font-bold"><Tag className="w-3 h-3"/>{v}<X className="w-3 h-3"/></button>)}</div>
          <label className="space-y-1 block"><span className="text-xs font-bold">รายละเอียดข้อเสนอเพิ่มเติม</span><textarea rows={2} value={offerDetails} onChange={e=>setOfferDetails(e.target.value)} placeholder="ราคา แพ็กเกจ หรือเงื่อนไขเฉพาะราย" className="w-full px-3 py-2 rounded-xl border"/></label>
          {legacyOffer && <details className="text-[11px] text-[#7B6A45]"><summary className="cursor-pointer">ดูข้อเสนอเดิมที่ยังจับคู่ไม่ได้</summary><div className="mt-1 pl-3">{legacyOffer}</div></details>}
        </>)}

        </div>
        <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-[#E4EAE2] px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
          <span className="hidden sm:inline text-[11px] text-[#7B8D81]">ข้อมูลจะถูกบันทึกเมื่อกด “บันทึกข้อมูล” เท่านั้น</span>
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[#5C7164]">ยกเลิก</button>
            <button disabled={saving} className="px-5 py-2 rounded-xl bg-[#1B3E2D] text-white font-bold flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4"/>{saving?'กำลังบันทึก…':'บันทึกข้อมูล'}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>;
};
