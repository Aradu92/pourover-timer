import { buildAnalyticsHtml } from '../src/frontend-utils';

describe('Analytics HTML builder', () => {
  test('buildAnalyticsHtml returns message when no brews', () => {
    const html = buildAnalyticsHtml([], {});
    expect(html).toContain('No brews found');
  });

  test('buildAnalyticsHtml returns rows for brews', () => {
    const brews = [
      { id: '1', timestamp: new Date().toISOString(), beans: 'Test Beans', rating: 5, recipe: { name: 'R1', stages: [{ name: 'S1', duration: 30, waterAmount: 50 }] } },
      { id: '2', timestamp: new Date().toISOString(), beans: 'Other', rating: 4, recipe: { name: 'R2', stages: [{ name: 'S1', duration: 30, waterAmount: 60 }] } }
    ];
    const html = buildAnalyticsHtml(brews, {});
    expect(html).toContain('Test Beans');
    expect(html).toContain('Other');
    expect(html).toContain('R1');
    expect(html).toContain('R2');
  });
});
