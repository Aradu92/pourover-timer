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
