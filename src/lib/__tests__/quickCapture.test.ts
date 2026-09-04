import { describe, expect, it } from 'vitest';
import { parseCapture, toRecord } from '@/lib/quickCapture';

const today = '2026-09-01'; // a Tuesday

describe('universal capture router', () => {
  it('bare actionable text defaults to an undated task', () => {
    const p = parseCapture('Fix the broken sitemap on frenchyfab', today);
    expect(p.target).toBe('tasks');
    expect(p.title).toBe('Fix the broken sitemap on frenchyfab');
    expect(p.due).toBeUndefined();
    const record = toRecord(p, today);
    expect(record.dueDate).toBe('');
    expect(record.scheduledAt).toBeUndefined();
  });

  it('explicit prefixes win: > task, # note, ! idea, @ reminder', () => {
    expect(parseCapture('> call the accountant', today).target).toBe('tasks');
    expect(parseCapture('# server notes from today', today).target).toBe('notes');
    expect(parseCapture('! what if we auto-tweet changelogs?', today).target).toBe('ideas');
    expect(parseCapture('@ renew SSL tomorrow at 09:30', today).target).toBe('reminders');
  });

  it('a bare URL becomes a link with the url kept', () => {
    const p = parseCapture('https://example.com/post/about-seo', today);
    expect(p.target).toBe('links');
    expect(p.url).toBe('https://example.com/post/about-seo');
    expect(p.title).toBe('https://example.com/post/about-seo');
  });

  it('url + words stays a task and keeps the url as a field', () => {
    const p = parseCapture('read this today https://example.com/article', today);
    expect(p.target).toBe('tasks');
    expect(p.url).toBe('https://example.com/article');
  });

  it('priority words are recognized and stripped from the title', () => {
    const p = parseCapture('urgent: call hosting support', today);
    expect(p.priority).toBe('critical');
    expect(p.title).toBe(': call hosting support');
  });

  it('relative dates: today, tomorrow, in 3 days, next week', () => {
    expect(parseCapture('ship the post today', today).due).toBe('2026-09-01');
    expect(parseCapture('ship the post tomorrow', today).due).toBe('2026-09-02');
    expect(parseCapture('ship the post in 3 days', today).due).toBe('2026-09-04');
    expect(parseCapture('ship the post next week', today).due).toBe('2026-09-08');
  });

  it('"on friday" resolves to the next friday', () => {
    expect(parseCapture('review numbers on friday', today).due).toBe('2026-09-04');
  });

  it('times are normalized to HH:MM', () => {
    expect(parseCapture('standup at 9:05', today).time).toBe('09:05');
    expect(parseCapture('call at 14:30 tomorrow', today).time).toBe('14:30');
  });

  it('inline #tags are extracted and removed from the title', () => {
    const p = parseCapture('renew domain #admin #frenchyfab', today);
    expect(p.tags).toEqual(['admin', 'frenchyfab']);
    expect(p.title).toBe('renew domain');
  });

  it('a question defaults to an idea, not a task', () => {
    expect(parseCapture('should we migrate to cloudflare workers?', today).target).toBe('ideas');
  });

  it('reminders always get a time (default 09:00)', () => {
    const p = parseCapture('@ pay the invoice tomorrow', today);
    expect(p.target).toBe('reminders');
    expect(p.time).toBe('09:00');
    expect(p.due).toBe('2026-09-02');
  });

  it('task dates become planning fields, never fabricated hard deadlines', () => {
    const task = toRecord(parseCapture('> urgent fix sitemap tomorrow at 10:00', today), today);
    expect(task).toMatchObject({
      priority: 'critical',
      status: 'todo',
      dueDate: '',
      scheduledAt: '2026-09-02',
      notBefore: '2026-09-02',
      reviewAt: '2026-09-02',
      startTime: '10:00',
      touchedAt: today,
    });
  });

  it('planning something today does not hide it behind notBefore', () => {
    const task = toRecord(parseCapture('> ship post today at 10:00', today), today);
    expect(task).toMatchObject({ dueDate: '', scheduledAt: today, startTime: '10:00' });
    expect(task.notBefore).toBeUndefined();
  });

  it('reminder dates remain actual reminder timestamps', () => {
    const reminder = toRecord(parseCapture('@ renew SSL tomorrow at 09:30', today), today);
    expect(reminder).toMatchObject({ status: 'pending', remindAt: '2026-09-02T09:30:00' });
  });

  it('nothing is ever dropped', () => {
    const p = parseCapture('   !!!???   ', today);
    expect(p.title.length + p.target.length).toBeGreaterThan(0);
  });
});
