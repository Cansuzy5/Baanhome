import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { SearchAnalyticsEvent } from '../src/utils/nongHomeAnalyticsModel.js';
export const EVENT_PREFIX = 'nh-analytics-event-';
export const META_ID = 'nh-analytics-meta';
export function analyticsKey(secret = process.env.NONG_HOME_ANALYTICS_SECRET): Buffer {
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) throw new Error('ANALYTICS_NOT_CONFIGURED');
  return Buffer.from(secret, 'hex');
}
export function encryptAnalytics(event: SearchAnalyticsEvent, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(event.id));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(event), 'utf8'), cipher.final()]);
  return { version: 1, iv: iv.toString('base64'), ciphertext: ciphertext.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}
export function decryptAnalytics(id: string, data: any, key: Buffer): SearchAnalyticsEvent {
  if (data?.version !== 1) throw new Error('INVALID_ANALYTICS_RECORD');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(data.iv, 'base64'));
  decipher.setAAD(Buffer.from(id)); decipher.setAuthTag(Buffer.from(data.tag, 'base64'));
  const event = JSON.parse(Buffer.concat([decipher.update(Buffer.from(data.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
  if (event.id !== id) throw new Error('INVALID_ANALYTICS_RECORD');
  return event;
}
export function validateAnalyticsEvent(value: any, now = Date.now()): SearchAnalyticsEvent {
  const text = (name: string, max: number) => typeof value?.[name] === 'string' && value[name].length > 0 && value[name].length <= max;
  if (!text('id', 64) || !/^\d{13}-[a-f0-9-]{36}$/i.test(value.id) || !text('timestamp', 40) ||
      !Number.isFinite(Date.parse(value.timestamp)) || value.id.split('-')[0] !== String(Date.parse(value.timestamp)) || Math.abs(now - Date.parse(value.timestamp)) > 300000 ||
      !text('staffId', 128) || !/^[\w-]+$/.test(value.staffId) || !text('staffName', 100) || !text('department', 100) ||
      !text('question', 500) || value.question.trim().length < 2 || !Number.isInteger(value.resultCount) || value.resultCount < 0 || value.resultCount > 10000 ||
      typeof value.found !== 'boolean' || value.found !== (value.resultCount > 0)) throw new Error('INVALID_ANALYTICS_EVENT');
  const { id, timestamp, staffId, staffName, department, question, resultCount, found } = value;
  return { id, timestamp, staffId, staffName, department, question, resultCount, found };
}
export function analyticsRange(from: unknown, to: unknown) {
  if (typeof from !== 'string' || typeof to !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new Error('INVALID_DATE_RANGE');
  const start = Date.parse(`${from}T00:00:00+07:00`);
  const end = Date.parse(`${to}T00:00:00+07:00`) + 86400000;
  if (!Number.isFinite(start) || !Number.isFinite(end) || new Date(start + 25200000).toISOString().slice(0, 10) !== from || new Date(end - 86400000 + 25200000).toISOString().slice(0, 10) !== to || end <= start || end - start > 366 * 86400000) throw new Error('INVALID_DATE_RANGE');
  return { start, end, lower: `${EVENT_PREFIX}${start}-`, upper: `${EVENT_PREFIX}${end}-` };
}
