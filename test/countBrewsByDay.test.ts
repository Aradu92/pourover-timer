import { countBrewsByDay } from '../src/frontend-utils';

describe('countBrewsByDay', () => {
  test('counts brews grouped by day for last N days', () => {
    const today = new Date();
    // Create timestamps at UTC-midnight to match the helper's UTC-based keys
    const t0 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())).toISOString();
    const t1 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1)).toISOString();
    const t2 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 2)).toISOString();
    const brews = [
      { id: '1', timestamp: t0 },
      { id: '2', timestamp: t1 },
      { id: '3', timestamp: t1 },
      { id: '4', timestamp: t2 }
    ];
    const res = countBrewsByDay(brews, 3);
    // We should have 3 days; labels correspond to t2, t1, t0 in order; values sum to 4
    expect(res.labels.length).toBe(3);
    expect(res.values.reduce((a,b)=>a+b,0)).toBe(4);
    // Check specific day counts
    const day0 = new Date(t0).toISOString().split('T')[0];
    const day1 = new Date(t1).toISOString().split('T')[0];
    const day2 = new Date(t2).toISOString().split('T')[0];
    expect(res.countsByDay[day0]).toBe(1);
    expect(res.countsByDay[day1]).toBe(2);
    expect(res.countsByDay[day2]).toBe(1);
  });
});
