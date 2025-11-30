// Minimal script to test scaling logic outside the browser

// Simulate DOM element for planned-beans-input
const document = {
  getElementById: (id) => {
    if (id === 'planned-beans-input') {
      return { value: '18', dataset: {} };
    }
    return null;
  }
};

// staging variables
let appliedRecipeBaseBeans = 20;
let appliedRecipeBaseStages = [
  { name: 'Bloom', duration: 30, waterAmount: 50, instruction: 'Pour 1: 50 grams' },
  { name: 'First Pour', duration: 45, waterAmount: 150, instruction: 'Pour 2: 150 grams' }
];
let pourStages = [];

function scaleAndApplyStages() {
  const plannedInput = document.getElementById('planned-beans-input');
  const planned = plannedInput ? parseFloat(plannedInput.value) : NaN;
  if (!appliedRecipeBaseStages || appliedRecipeBaseStages.length === 0) {
    console.log('No applied recipe');
    return;
  }
  if (!isNaN(planned) && planned > 0 && appliedRecipeBaseBeans && appliedRecipeBaseBeans > 0) {
    const ratio = planned / appliedRecipeBaseBeans;
    pourStages = appliedRecipeBaseStages.map(s => ({ ...s, waterAmount: Math.round((s.waterAmount || 0) * ratio), instruction: `Pour: ${Math.round((s.waterAmount || 0) * ratio)} grams` }));
  } else {
    pourStages = appliedRecipeBaseStages.map(s => ({ ...s }));
  }
  pourStages.forEach((s, idx) => { s.instruction = `Pour ${idx + 1}: ${s.waterAmount} grams`; });
}

scaleAndApplyStages();
console.log('Scaled pourStages:', pourStages);
console.log('Total:', pourStages.reduce((s,p)=>s+(p.waterAmount||0),0));
