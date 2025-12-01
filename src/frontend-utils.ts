// Utilities for frontend calculations used by timer UI and tests
export interface Stage { name: string; duration: number; waterAmount: number; instruction?: string }

export function computeDefaultBeansUsed(pourStages: Stage[] | null | undefined): number {
  try {
    if (!Array.isArray(pourStages) || pourStages.length === 0) return 10;
    const totalWater = pourStages.reduce((sum, st) => sum + (st.waterAmount || 0), 0);
    const beansUsed = Math.round(totalWater / 16);
    return Math.max(1, beansUsed);
  } catch (err) {
    return 10;
  }
}

export function scaleStages(appliedRecipeBaseStages: Stage[] | null | undefined, appliedRecipeBaseBeans: number | null | undefined, planned: number | null | undefined): Stage[] {
  if (!appliedRecipeBaseStages || appliedRecipeBaseStages.length === 0) return [];
  if (!appliedRecipeBaseBeans || appliedRecipeBaseBeans <= 0 || !planned || planned <= 0 || Number.isNaN(planned)) {
    return appliedRecipeBaseStages.map(s => ({ ...s }));
  }
  const ratio = planned / appliedRecipeBaseBeans;
  const scaled = appliedRecipeBaseStages.map(s => ({
    ...s,
    waterAmount: Math.round((s.waterAmount || 0) * ratio),
    instruction: `Pour: ${Math.round((s.waterAmount || 0) * ratio)} grams`
  }));
  scaled.forEach((s, idx) => { s.instruction = `Pour ${idx + 1}: ${s.waterAmount} grams`; });
  return scaled;
}

export function totalWaterForStages(stages: Stage[]): number {
  return stages.reduce((sum, s) => sum + (s.waterAmount || 0), 0);
}

export function buildAnalyticsHtml(brews: any[], beanMap: Record<string, any> | null | undefined) {
  if (!Array.isArray(brews) || brews.length === 0) return '<p class="text-gray-500 text-center py-8">No brews found matching filters.</p>';
  return brews.map(brew => {
  const date = new Date(brew.timestamp).toLocaleDateString();
  const stars = '⭐'.repeat(brew.rating || 0);
  const recipeName = brew.recipe && brew.recipe.name ? brew.recipe.name : 'Default Recipe';
  const beanLabel = brew.beanBagId && beanMap && beanMap[brew.beanBagId] ? `${beanMap[brew.beanBagId].name} • ${brew.beansUsed || ''}g` : (brew.beans || 'Unknown Beans');

  return `
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h3 class="font-semibold text-lg">${beanLabel}</h3>
            <p class="text-sm text-gray-600">${date}</p>
          </div>
          <div class="text-right">
            <div class="text-amber-500">${stars}</div>
            <p class="text-xs text-gray-500">${brew.rating || 0}/5</p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm mt-3">
          ${brew.origin ? `<div><span class="text-gray-600">Origin:</span> <span class="font-medium">${brew.origin}</span></div>` : ''}
          ${brew.roast ? `<div><span class="text-gray-600">Roast:</span> <span class="font-medium">${brew.roast}</span></div>` : ''}
          ${brew.masl ? `<div><span class="text-gray-600">MASL:</span> <span class="font-medium">${brew.masl}</span></div>` : ''}
          ${brew.grinder ? `<div><span class="text-gray-600">Grinder:</span> <span class="font-medium">${brew.grinder}</span></div>` : ''}
          ${brew.grindSize ? `<div><span class="text-gray-600">Grind Size:</span> <span class="font-medium">${brew.grindSize}</span></div>` : ''}
          <div><span class="text-gray-600">Recipe:</span> <span class="font-medium">${recipeName}</span></div>
        </div>
        ${brew.notes ? `<div class="mt-3 pt-3 border-t border-gray-200"><p class="text-sm text-gray-700"><span class="font-medium">Notes:</span> ${brew.notes}</p></div>` : ''}
        ${brew.recipe && brew.recipe.stages ? `
          <div class="mt-3 pt-3 border-t border-gray-200">
            <p class="text-xs font-medium text-gray-600 mb-2">Recipe Details:</p>
            <div class="grid grid-cols-2 gap-1 text-xs">
              ${brew.recipe.stages.map((stage: any, idx: number) => `
                <div class="text-gray-600">Stage ${idx + 1}: ${stage.waterAmount}g @ ${stage.duration}s</div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

export function countBrewsByDay(brews: any[], days = 30) {
  const countsByDay: Record<string, number> = {};
  const today = new Date();
  // Build last N days keys using UTC to avoid local timezone shifts
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const key = d.toISOString().split('T')[0];
    countsByDay[key] = 0;
  }
  (brews || []).forEach(brew => {
    if (brew && brew.timestamp) {
      const key = new Date(brew.timestamp).toISOString().split('T')[0];
      if (countsByDay[key] !== undefined) countsByDay[key]++;
    }
  });
  return { labels: Object.keys(countsByDay), values: Object.values(countsByDay), countsByDay };
}


