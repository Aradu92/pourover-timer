import { computeDefaultBeansUsed, scaleStages, totalWaterForStages } from '../src/frontend-utils';

describe('Frontend utils', () => {
  test('computeDefaultBeansUsed returns default when no stages', () => {
    expect(computeDefaultBeansUsed([])).toBe(10);
    expect(computeDefaultBeansUsed(null as any)).toBe(10);
  });

  test('computeDefaultBeansUsed computes correctly', () => {
    const stages = [
      { name: 'Bloom', duration: 30, waterAmount: 50 },
      { name: 'Pour', duration: 45, waterAmount: 150 }
    ];
    // total water = 200 -> default beans = round(200 / 16) = 13 (12.5 -> 13)
    expect(computeDefaultBeansUsed(stages)).toBe(13);
  });

  test('scaleStages scales water and instructions', () => {
    const baseStages = [
      { name: 'Bloom', duration: 30, waterAmount: 50 },
      { name: 'First Pour', duration: 45, waterAmount: 150 }
    ];
    const baseBeans = 20;
    const planned = 10; // ratio 0.5
    const scaled = scaleStages(baseStages, baseBeans, planned);
    expect(scaled.length).toBe(2);
    expect(scaled[0].waterAmount).toBe(25);
    expect(scaled[1].waterAmount).toBe(75);
    expect(totalWaterForStages(scaled)).toBe(100);
  });
});
