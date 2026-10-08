// Keep every HTTP request and Firestore document well below their size limits.
export const PART_CHARS = 160000;
export const MAX_PARTS = 160;
export function splitContent(value: unknown): string[] {
  const text = JSON.stringify(value);
  const parts: string[] = [];
  for (let i = 0; i < text.length;) {
    let end = Math.min(i + PART_CHARS, text.length);
    const last = text.charCodeAt(end - 1);
    if (end < text.length && last >= 0xd800 && last <= 0xdbff) end--;
    parts.push(text.slice(i, end));
    i = end;
  }
  if (!parts.length || parts.length > MAX_PARTS) throw new Error('ข้อมูลมีขนาดใหญ่เกินไป');
  return parts;
}
export function validateValue(kind: string, key: string, value: any) {
  if (kind === 'knowledge') {
    if (key !== 'main' || !value || !(value.items === null || Array.isArray(value.items)) ||
        typeof value.sheetUrl !== 'string' || !(value.lastSynced === null || typeof value.lastSynced === 'string')) throw new Error('Invalid knowledge payload');
  } else if (!key || key.length > 200 || !(value === null || (Array.isArray(value) && value.every(v => typeof v === 'string' && /^(https?:\/\/|data:image\/)/.test(v))))) {
    throw new Error('Invalid image payload');
  }
}
