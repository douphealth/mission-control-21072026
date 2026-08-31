import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(p, 'utf8');

describe('production trust guarantees', () => {
  it('never seeds fictional operational records on bootstrap', () => {
    const src = read('src/contexts/DashboardContext.tsx');
    expect(src).not.toMatch(/seedDefaults/);
    expect(src).not.toMatch(/agency-demo\.com|fashion-store\.com|alexdev/);
  });

  it('legacy store default dataset is empty', () => {
    const src = read('src/lib/store.ts');
    expect(src).not.toMatch(/agency-demo\.com|alexdev|S3cur3P@ss/);
  });

  it('insight stat tiles contain no hard-coded trend percentages', () => {
    const src = read('src/components/dashboard/InsightsPanel.tsx');
    expect(src).not.toMatch(/'\+5\.4%'|'\+3\.2%'|'\+8\.1%'|'\+12\.8%'/);
    expect(src).toMatch(/No comparison data/);
  });

  it('the canonical home leads with Now / Today, not analytics', () => {
    const src = read('src/pages/DashboardHome.tsx');
    expect(src).toMatch(/DailyHero/);
    expect(src).toMatch(/TodayCommitments/);
    expect(src).toMatch(/AttentionFeed/);
  });


  it('the app lands on the dashboard', () => {
    expect(read('src/stores/navigationStore.ts')).toMatch(/activeSection: 'dashboard'/);
  });
});
