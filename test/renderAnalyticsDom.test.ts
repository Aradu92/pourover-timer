/**
 * @jest-environment jsdom
 */
import { buildAnalyticsHtml } from '../src/frontend-utils';

describe('Analytics DOM render', () => {
  test('rendering the HTML into container shows brew entries', () => {
    document.body.innerHTML = '<div id="analytics-brews-list"></div>';
    const brews = [
      { id: '1', timestamp: new Date().toISOString(), beans: 'Test Beans', rating: 5, recipe: { name: 'R1', stages: [{ name: 'S1', duration: 30, waterAmount: 50 }] } },
      { id: '2', timestamp: new Date().toISOString(), beans: 'Other', rating: 4, recipe: { name: 'R2', stages: [{ name: 'S1', duration: 30, waterAmount: 60 }] } }
    ];
    const html = buildAnalyticsHtml(brews, {});
    const container = document.getElementById('analytics-brews-list');
    if (!container) throw new Error('Container not found');
    container.innerHTML = html;
    expect(container.querySelectorAll('div.bg-white').length).toBe(2);
    expect(container.textContent).toContain('Test Beans');
    expect(container.textContent).toContain('Other');
  });
});
