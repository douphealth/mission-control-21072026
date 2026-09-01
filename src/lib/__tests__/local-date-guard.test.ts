import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..', '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('local-date regression guards', () => {
  // The UTC bug class: components computing "today" via toISOString() lie
  // by a day for every timezone ahead of UTC in the evening (e.g. UTC+3).
  // These were real bugs found in TopBar and CommandPalette.
  it('TopBar uses the local todayISO helper, never toISOString', () => {
    const src = read('src/components/TopBar.tsx');
    expect(src).toMatch(/todayISO/);
    expect(src).not.toMatch(/toISOString\(\)\.split\('T'\)\[0\]/);
  });

  it('CommandPalette uses the local todayISO helper, never toISOString', () => {
    const src = read('src/components/CommandPalette.tsx');
    expect(src).toMatch(/todayISO/);
    expect(src).not.toMatch(/toISOString\(\)\.split\('T'\)\[0\]/);
  });

  it('the palette offers inline capture for free text', () => {
    const src = read('src/components/CommandPalette.tsx');
    expect(src).toMatch(/parseCapture/);
    expect(src).toMatch(/Capture: /);
  });
});
