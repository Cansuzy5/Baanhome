export async function sharedApi(path: string, body?: unknown): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);
  try {
    const response = await fetch(path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: controller.signal });
    const result = await response.json();
    if (!response.ok || result.success === false) {
      if (response.status === 401 && (body as any)?.action !== 'login') window.dispatchEvent(new Event('baanhome-session-invalid'));
      throw new Error(result.error || 'เชื่อมต่อฐานข้อมูลกลางไม่สำเร็จ');
    }
    window.dispatchEvent(new CustomEvent('baanhome-sync-status', { detail: { path, error: null } }));
    return result;
  } catch (error: any) {
    const message = error.name === 'AbortError' ? 'การเชื่อมต่อใช้เวลานาน กรุณารีเฟรชตรวจสอบผลก่อนลองอีกครั้ง' : error.message;
    window.dispatchEvent(new CustomEvent('baanhome-sync-status', { detail: { path, error: message } }));
    throw new Error(message);
  } finally { clearTimeout(timer); }
}
