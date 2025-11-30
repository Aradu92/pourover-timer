// Pourover Timer Logic
console.log('Timer.js loaded successfully');

// Default recipe
let pourStages = [
    { name: 'Bloom', duration: 45, waterAmount: 50, instruction: 'Pour 1: 50 grams (Bloom)' },
    { name: 'First Pour', duration: 45, waterAmount: 100, instruction: 'Pour 2: 100 grams' },
    { name: 'Second Pour', duration: 45, waterAmount: 100, instruction: 'Pour 3: 100 grams' },
    { name: 'Final Pour', duration: 45, waterAmount: 100, instruction: 'Pour 4: 100 grams' }
];

let currentStageIndex = 0;
let timeRemaining = pourStages[0].duration;
let timerInterval = null;
let isRunning = false;
let totalDuration = 0;
let totalElapsed = 0; // Track total elapsed time for smooth progress

// Audio context for beep sound
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
console.log('Audio context created:', audioContext);

/**
 * Play a short beep sound using the global AudioContext instance `audioContext`.
 *
 * This function creates an OscillatorNode and a GainNode, connects them to the
 * audio context destination, configures a sine-wave oscillator at 800 Hz,
 * sets the gain to 0.3 and exponentially ramps it down to 0.01 over 0.5 seconds,
 * then starts and stops the oscillator at audioContext.currentTime and
 * audioContext.currentTime + 0.5 respectively. It logs progress and errors
 * to the console.
 *
 * Requirements:
 * - A valid AudioContext must be available in the variable `audioContext`.
 *
 * @function playBeep
 * @returns {void} Does not return a value.
 */
function playBeep() {
    console.log('Playing beep sound');
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        console.log('Beep played successfully');
    } catch (error) {
        console.error('Error playing beep:', error);
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateDisplay() {
    console.log('Updating display - Time remaining:', timeRemaining, 'Stage:', currentStageIndex);
    const timerDisplay = document.getElementById('timer-display');
    const instruction = document.getElementById('instruction');
    const progressBar = document.getElementById('progress-bar');
    
    // Update timer text
    if (timerDisplay) timerDisplay.textContent = formatTime(timeRemaining);
    // Update instruction text
    if (instruction) {
        if (isRunning && pourStages[currentStageIndex]) {
            instruction.textContent = pourStages[currentStageIndex].instruction || pourStages[currentStageIndex].name;
        } else if (!isRunning) {
            instruction.textContent = 'Press Start to Begin';
        }
    }
    // Update stage progress bar (percent complete for current stage)
    if (progressBar) {
        const stageDuration = (pourStages[currentStageIndex] && pourStages[currentStageIndex].duration) || 0;
        let pct = 0;
        if (stageDuration > 0) {
            pct = Math.max(0, Math.min(100, Math.round(((stageDuration - timeRemaining) / stageDuration) * 100)));
        }
        progressBar.style.width = `${pct}%`;
    }
    
    // Show/hide water drops during active pouring
    // Show/hide water drops during active pouring
    const waterDrops = document.getElementById('water-drops');
    if (waterDrops) {
        if (isRunning && currentStageIndex < pourStages.length) {
            waterDrops.style.display = 'block';
        } else {
            waterDrops.style.display = 'none';
        }
    }
}

// Update the visual stage indicators, water level and related UI elements
function updateStageIndicators() {
    // Update stage circles
    const totalStages = (Array.isArray(pourStages) && pourStages.length) ? pourStages.length : 4;
    for (let i = 0; i < totalStages; i++) {
        const circle = document.getElementById(`stage-${i + 1}`);
        if (!circle) continue;
        if (i < currentStageIndex) {
            circle.setAttribute('fill', '#22c55e'); // green for completed
            circle.classList.add('stage-complete');
            circle.classList.remove('stage-active');
        } else if (i === currentStageIndex && isRunning) {
            circle.setAttribute('fill', '#fb923c'); // amber for active
            circle.classList.add('stage-active');
            circle.classList.remove('stage-complete');
        } else {
            circle.setAttribute('fill', '#cbd5e1');
            circle.classList.remove('stage-active');
            circle.classList.remove('stage-complete');
        }
    }

    // Update overall water level progress
    const waterLevel = document.getElementById('water-level');
    if (waterLevel && Array.isArray(pourStages) && pourStages.length > 0) {
        const maxHeight = 150; // px of the dripper inner area (y 50 -> 200)
        const total = pourStages.reduce((s, p) => s + (p.duration || 0), 0);
        const elapsed = Math.max(0, Math.min(total, totalElapsed));
        const pct = total === 0 ? 0 : (elapsed / total);
        const heightPx = Math.round(maxHeight * pct);
        waterLevel.setAttribute('height', `${heightPx}`);
        waterLevel.setAttribute('y', `${200 - heightPx}`);
    }
}

// Render the stage indicator circles and labels dynamically inside the SVG
function renderStageIndicators() {
    const group = document.getElementById('stage-indicators');
    if (!group) return;
    // Clear existing
    while (group.firstChild) group.removeChild(group.firstChild);
    const totalStages = (Array.isArray(pourStages) && pourStages.length) ? pourStages.length : 4;
    const topY = 80;
    const span = 150; // matches original layout (80 -> 230)
    const spacing = totalStages > 1 ? span / (totalStages - 1) : 0;
    for (let i = 0; i < totalStages; i++) {
        const y = totalStages === 1 ? (topY + span / 2) : Math.round(topY + i * spacing);
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('id', `stage-${i + 1}`);
        circle.setAttribute('cx', '50');
        circle.setAttribute('cy', `${y}`);
        circle.setAttribute('r', '15');
        circle.setAttribute('fill', '#cbd5e1');
        circle.setAttribute('stroke', '#64748b');
        circle.setAttribute('stroke-width', '2');
        circle.classList.add('stage-indicator');
        group.appendChild(circle);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '45');
        text.setAttribute('y', `${y + 5}`);
        text.setAttribute('fill', '#1e293b');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-weight', 'bold');
        text.textContent = `${i + 1}`;
        group.appendChild(text);
    }
}

// Manage recipe setup inputs (show/hide based on stage-count selection)
function renderStageSetupInputs() {
    const stageCountSel = document.getElementById('stage-count');
    const cnt = parseInt((stageCountSel && stageCountSel.value) || '4');
    for (let i = 1; i <= 5; i++) {
        const row = document.getElementById(`stage-row-${i}`) || document.getElementById(`stage-row-${i}`);
        // For first 4 inputs, HTML structure uses grid rows without id, so fall back to known nodes
        if (!row) {
            // For rows 1-4, find by index: they are the inputs in the order defined. If not found, continue
            continue;
        }
        if (i <= cnt) {
            row.classList.remove('hidden');
            // Update labels for naming
            const label = row.querySelector('span');
            if (label) {
                if (i === 1) label.textContent = `${i}. Bloom`;
                else if (i === cnt && i > 1) label.textContent = `${i}. Final Pour`;
                else label.textContent = `${i}. Pour ${i}`;
            }
        } else {
            row.classList.add('hidden');
        }
    }
}

function nextStage() {
    console.log('Moving to next stage from:', currentStageIndex);
    // Advance stage index
    currentStageIndex++;
    // We don't re-create the tick interval here; the running interval handles ticks
    console.log('New stage index:', currentStageIndex);
    
    if (currentStageIndex < pourStages.length) {
        timeRemaining = pourStages[currentStageIndex].duration;
        playBeep();
        updateDisplay();
        updateStageIndicators();
    } else {
        // Timer completed
        console.log('Timer completed!');
        stopTimer();
        showCompletionForm();
    }
}

function tick() {
    console.log('Tick - Time remaining:', timeRemaining);
    timeRemaining--;
    totalElapsed++; // Increment total elapsed time for smooth progress
    updateDisplay();
    updateStageIndicators();
    
    if (timeRemaining <= 0) {
        nextStage();
    }
}

function startTimer() {
    console.log('startTimer called - isRunning:', isRunning);
    if (isRunning) {
        console.log('Timer already running, ignoring');
        return;
    }
    
    isRunning = true;
    console.log('Timer started!');
    
    // Calculate total duration
    totalDuration = pourStages.reduce((sum, stage) => sum + stage.duration, 0);
    console.log('Total duration:', totalDuration);
    
    if (currentStageIndex === 0 && timeRemaining === 0) {
        timeRemaining = pourStages[0].duration;
        totalElapsed = 0; // Reset total elapsed
        console.log('Initial time set to:', timeRemaining);
    }
    
    updateDisplay();
    updateStageIndicators();
    
    timerInterval = window.setInterval(tick, 1000);
    console.log('Interval started:', timerInterval);
    
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.textContent = 'Pause';
        startBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
        startBtn.classList.add('bg-yellow-600', 'hover:bg-yellow-700');
    }
}

function pauseTimer() {
    console.log('pauseTimer called');
    if (!isRunning) return;
    
    isRunning = false;
    console.log('Timer paused');
    
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.textContent = 'Resume';
        startBtn.classList.remove('bg-yellow-600', 'hover:bg-yellow-700');
        startBtn.classList.add('bg-green-600', 'hover:bg-green-700');
    }
}

function stopTimer() {
    console.log('stopTimer called');
    isRunning = false;
    
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    const waterDrops = document.getElementById('water-drops');
    if (waterDrops) {
        waterDrops.style.display = 'none';
    }
}

function resetTimer() {
    console.log('resetTimer called');
    stopTimer();
    currentStageIndex = 0;
    timeRemaining = 0;
    totalElapsed = 0; // Reset total elapsed
    
    const timerDisplay = document.getElementById('timer-display');
    const instruction = document.getElementById('instruction');
    const progressBar = document.getElementById('progress-bar');
    const waterLevel = document.getElementById('water-level');
    
    if (timerDisplay) timerDisplay.textContent = '00:00';
    if (instruction) instruction.textContent = 'Press Start to Begin';
    if (progressBar) progressBar.style.width = '0%';
    if (waterLevel) {
        waterLevel.setAttribute('height', '0');
        waterLevel.setAttribute('y', '200');
    }
    
    // Reset stage indicators
    const totalStages = (Array.isArray(pourStages) && pourStages.length) ? pourStages.length : 4;
    for (let i = 0; i < totalStages; i++) {
        const circle = document.getElementById(`stage-${i + 1}`);
        if (circle) {
            circle.setAttribute('fill', '#cbd5e1');
            circle.classList.remove('stage-active');
        }
    }
    
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.textContent = 'Start';
        startBtn.classList.remove('bg-yellow-600', 'hover:bg-yellow-700');
        startBtn.classList.add('bg-green-600', 'hover:bg-green-700');
    }
    
    hideCompletionForm();
    console.log('Timer reset complete');
}

async function showCompletionForm() {
    console.log('Showing completion form');
    const form = document.getElementById('completion-form');
    if (form) {
        form.classList.remove('hidden');
        playBeep();
        setTimeout(() => playBeep(), 500);
        // refresh the saved beans select so we can auto-select a default
        try { await loadBeans(); } catch (err) { console.warn('loadBeans failed on modal show', err); }
        // Pre-populate beans-used input based on current recipe when the form is shown
        let beansUsedInput = document.getElementById('beans-used-input');
        if (beansUsedInput && (!beansUsedInput.value || beansUsedInput.value === '')) {
            beansUsedInput.value = '' + computeDefaultBeansUsed();
        }
        // If a saved bean is selected, populate bean name input
        const savedBeansSelect = document.getElementById('saved-beans');
        const beansInput = document.getElementById('beans-input');
        if (savedBeansSelect) {
            console.log('savedBeansSelect options count on form show:', savedBeansSelect.options.length);
            console.log('savedBeansSelect first options:', Array.from(savedBeansSelect.options).map(o => o.textContent));
        }
        if (savedBeansSelect && savedBeansSelect.value && beansInput) {
            const opt = savedBeansSelect.options[savedBeansSelect.selectedIndex];
            if (opt && opt.dataset.bean) {
                const bean = JSON.parse(opt.dataset.bean);
                beansInput.value = bean.name || beansInput.value;
                // populate metadata fields directly (in case change handler wasn't attached)
                const originInput = document.getElementById('origin-input');
                const roastInput = document.getElementById('roast-input');
                const maslInput = document.getElementById('masl-input');
                if (bean.origin && originInput) originInput.value = bean.origin;
                if (bean.roast && roastInput) roastInput.value = bean.roast;
                if (bean.masl && maslInput) maslInput.value = bean.masl;
            }
        }
        // If user typed bean name and matches a saved bag, select it in the select box
        if (beansInput && savedBeansSelect && beansInput.value) {
            const typed = beansInput.value.trim().toLowerCase();
            const selOpt = Array.from(savedBeansSelect.options).find(o => (o.textContent || '').toLowerCase().includes(typed));
            if (selOpt) {
                savedBeansSelect.value = selOpt.value;
                // trigger change behavior to set beansUsed input if needed
                const evt = new Event('change');
                savedBeansSelect.dispatchEvent(evt);
            }
        }
        // If there is no beansInput value but there are saved bean options, pick the first available bag with remaining
        // reuse beansUsedInput variable
        if (savedBeansSelect && beansInput && (!beansInput.value || beansInput.value === '')) {
            const opt = Array.from(savedBeansSelect.options).find(o => o.value && o.dataset.bean);
            if (opt) {
                try {
                    const bean = JSON.parse(opt.dataset.bean);
                    if (bean && bean.name) {
                        savedBeansSelect.value = opt.value;
                        beansInput.value = bean.name;
                        if (beansUsedInput) beansUsedInput.value = '' + computeDefaultBeansUsed();
                        const originInput = document.getElementById('origin-input');
                        const roastInput = document.getElementById('roast-input');
                        const maslInput = document.getElementById('masl-input');
                        if (bean.origin && originInput) originInput.value = bean.origin;
                        if (bean.roast && roastInput) roastInput.value = bean.roast;
                        if (bean.masl && maslInput) maslInput.value = bean.masl;
                    }
                } catch (err) {
                    console.warn('Could not parse bean dataset for opt', opt, err);
                }
            }
        }
        // Ensure save button has an attached handler in case DOMContentLoaded wiring failed
        // client-side validation for grindSize range
        if (grindSize !== null && (isNaN(grindSize) || grindSize < 0 || grindSize > 5000)) {
            return alert('Please enter a valid grind size between 0 and 5000.');
        }
        if (!beanBagId && beans && window._beanMap) {
            const nameToMatch = beans.trim().toLowerCase();
            const found = Object.values(window._beanMap).find(b => (b.name || '').trim().toLowerCase() === nameToMatch);
            if (found) {
                beanBagId = found.id;
                console.log('Mapped typed bean name to saved beanBagId:', beanBagId);
            }
        }
        try {
            const saveBrewBtnEl = document.getElementById('save-brew-btn');
            if (saveBrewBtnEl && !saveBrewBtnEl.dataset.saveAttached) {
                saveBrewBtnEl.addEventListener('click', handleSaveBrewClick);
                saveBrewBtnEl.dataset.saveAttached = 'true';
            }
        } catch (err) {
            console.warn('Could not attach save handler in showCompletionForm', err);
        }
    }
}

// Central handler for the Save Brew button — extracted so it can be attached reliably
async function handleSaveBrewClick() {
    console.log('Save Brew button clicked');
    const beansInput = document.getElementById('beans-input');
    const ratingValue = document.getElementById('rating-value');
    const beans = beansInput?.value || 'Unknown';
    const rating = parseInt(ratingValue?.value || '0');
    const originInput = document.getElementById('origin-input');
    const roastInput = document.getElementById('roast-input');
    const maslInput = document.getElementById('masl-input');
    const notesInput = document.getElementById('notes-input');
    const grinderInput = document.getElementById('grinder-input');
    const grindSizeInput = document.getElementById('grind-size-input');

    const origin = originInput?.value || '';
    const roast = roastInput?.value || '';
    const masl = maslInput?.value || '';
    const notes = notesInput?.value || '';
    const grinder = grinderInput?.value || '';
    const rawGrindSize = grindSizeInput?.value;
    const grindSize = (rawGrindSize !== undefined && rawGrindSize !== null && rawGrindSize !== '') ? parseFloat(rawGrindSize) : undefined;
    const savedBeansSelect = document.getElementById('saved-beans');
    let beanBagId = savedBeansSelect?.value || '';
    const beansUsedInput = document.getElementById('beans-used-input');
    let beansUsed = (beansUsedInput?.value && beansUsedInput.value !== '') ? parseFloat(beansUsedInput.value) : computeDefaultBeansUsed();

    try {
        console.log('Saving brew payload (pre):', { beans, rating, origin, roast, masl, grinder, grindSize, beanBagId, beansUsed });
        // Allow saving even if rating is zero to avoid accidental blocking of save
        // (rating is optional)
        try {
            const saveBtnEl = document.getElementById('save-brew-btn');
            if (saveBtnEl) saveBtnEl.disabled = true;
            await saveBrew(beans, rating, origin, roast, masl, notes, grinder, grindSize, beanBagId, beansUsed);
        } finally {
            try { const saveBtnEl2 = document.getElementById('save-brew-btn'); if (saveBtnEl2) saveBtnEl2.disabled = false; } catch (e) {}
        }
        return;
    } catch (err) {
        console.error('Error handling Save Brew click', err);
        alert('Error saving brew (see console)');
    }
}

function hideCompletionForm() {
    const form = document.getElementById('completion-form');
    const beansInput = document.getElementById('beans-input');
    const originInput = document.getElementById('origin-input');
    const roastInput = document.getElementById('roast-input');
    const maslInput = document.getElementById('masl-input');
    const notesInput = document.getElementById('notes-input');
    const ratingValue = document.getElementById('rating-value');
    const saveMessage = document.getElementById('save-message');
    
    if (form) form.classList.add('hidden');
    if (beansInput) beansInput.value = '';
    if (originInput) originInput.value = '';
    if (roastInput) roastInput.value = '';
    if (maslInput) maslInput.value = '';
    if (notesInput) notesInput.value = '';
    if (ratingValue) ratingValue.value = '0';
    if (saveMessage) saveMessage.classList.add('hidden');
    
    // Reset rating stars
    document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.classList.remove('opacity-50');
    });
}

// Compute a default beans used value based on total water in the current recipe.
// Default rule: total water grams divided by 16 (coffee:water ratio), rounded.
function computeDefaultBeansUsed() {
    try {
        if (!Array.isArray(pourStages) || pourStages.length === 0) return 10;
        const totalWater = pourStages.reduce((sum, st) => sum + (st.waterAmount || 0), 0);
        const beansUsed = Math.round(totalWater / 16);
        return Math.max(1, beansUsed);
    } catch (err) {
        console.warn('computeDefaultBeansUsed error', err);
        return 10;
    }
}

async function saveBrew(beans, rating, origin, roast, masl, notes, grinder, grindSize, beanBagId, beansUsed) {
    console.log('saveBrew invoked: payload summary', { beans, rating, origin, roast, masl, grinder, grindSize, beanBagId, beansUsed });
    
    // Capture current recipe
    const recipeData = {
        name: 'Custom Recipe',
        stages: pourStages.map(stage => ({
            name: stage.name,
            duration: stage.duration,
            waterAmount: stage.waterAmount
        }))
    };
    
    try {
        // Build body and omit null/invalid fields to avoid server validation errors
        const payload = {
            beans,
            rating: parseInt(rating) || 0,
            origin,
            roast,
            masl,
            grinder,
            beanBagId: beanBagId || undefined,
            notes,
            recipe: recipeData
        };
        if (grindSize !== null && grindSize !== undefined && !isNaN(grindSize)) payload.grindSize = grindSize;
        if (beansUsed !== null && beansUsed !== undefined && !isNaN(beansUsed)) payload.beansUsed = beansUsed;

        const response = await fetch('http://localhost:3000/api/brews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            console.log('Brew saved successfully');
            const saveMessage = document.getElementById('save-message');
            if (saveMessage) {
                saveMessage.classList.remove('hidden');
                setTimeout(() => {
                    hideCompletionForm();
                    resetTimer();
                }, 2000);
            }
            loadBrews();
            // Update beans inventory list after saving
            loadBeans();
        } else {
            let bodyText = '';
            try {
                const data = await response.json();
                bodyText = JSON.stringify(data);
                console.error('Failed to save brew, status:', response.status, data);
                alert('Failed to save brew: ' + (data.error || bodyText));
            } catch (err) {
                bodyText = await response.text();
                console.error('Failed to save brew, status:', response.status, bodyText);
                alert('Failed to save brew: ' + bodyText);
            }
        }
    } catch (error) {
        console.error('Error saving brew:', error);
        alert('Failed to save brew. Make sure the server is running.');
    }
}

async function loadBrews() {
    console.log('Loading brews...');
    try {
        const response = await fetch('http://localhost:3000/api/brews');
        const brews = await response.json();
        // Also fetch bean bags to map names
        let beanMap = {};
        try {
            const beansResp = await fetch('http://localhost:3000/api/beans');
            if (beansResp.ok) {
                const beans = await beansResp.json();
                beans.forEach(b => { beanMap[b.id] = b; });
            }
        } catch (err) { console.warn('Could not fetch bean bags for brew list', err); }
        console.log('Loaded brews:', brews);
        
        const brewsList = document.getElementById('brews-list');
        if (brewsList) {
            if (brews.length === 0) {
                brewsList.innerHTML = '<p class="text-gray-500 text-center">No brews yet</p>';
            } else {
                brewsList.innerHTML = brews
                    .slice(-10)
                    .reverse()
                    .map((brew) => {
                        const date = new Date(brew.timestamp).toLocaleDateString();
                        const stars = '⭐'.repeat(brew.rating);
                        let beanLabel = brew.beans || '';
                        if (brew.beanBagId && beanMap[brew.beanBagId]) {
                            const used = (brew.beansUsed !== undefined && brew.beansUsed !== null) ? `${brew.beansUsed}g` : '';
                            beanLabel = `${beanMap[brew.beanBagId].name}${used ? ' • ' + used : ''}`;
                        }
                        return `
                            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg group">
                                <div>
                                    <span class="font-medium">${beanLabel}</span>
                                    <span class="text-sm text-gray-500 ml-2">${date}</span>
                                    ${brew.grinder ? `<div class="text-xs text-gray-600">Grinder: ${brew.grinder} ${brew.grindSize ? `• ${brew.grindSize}` : ''}</div>` : ''}
                                </div>
                                <div class="flex items-center gap-2">
                                    <span>${stars}</span>
                                    <button onclick="deleteBrew('${brew.id}')" 
                                            class="opacity-0 group-hover:opacity-100 transition text-red-600 hover:text-red-800 font-bold">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        `;
                    })
                    .join('');
            }
        }
    } catch (error) {
        console.error('Error loading brews:', error);
    }
}

async function deleteBrew(brewId) {
    console.log('Deleting brew:', brewId);
    if (!confirm('Are you sure you want to delete this brew?')) {
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:3000/api/brews/${brewId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            console.log('Brew deleted successfully');
            loadBrews();
        } else {
            console.error('Failed to delete brew');
        }
    } catch (error) {
        console.error('Error deleting brew:', error);
        alert('Failed to delete brew');
    }
}

// Recipe Management Functions
async function loadRecipes() {
    console.log('Loading recipes...');
    try {
        const response = await fetch('http://localhost:3000/api/recipes');
        const recipes = await response.json();
        console.log('Loaded recipes:', recipes);

        const savedRecipes = document.getElementById('saved-recipes');
        if (savedRecipes) {
            savedRecipes.innerHTML = '<option value="">-- Select a saved recipe --</option>';
            recipes.forEach(recipe => {
                const option = document.createElement('option');
                option.value = recipe.id;
                option.textContent = recipe.name;
                option.dataset.recipe = JSON.stringify(recipe);
                savedRecipes.appendChild(option);
            });
            // reset editing state to avoid accidental overwrites
            const editingRecipeField = document.getElementById('editing-recipe-id');
            if (editingRecipeField) editingRecipeField.value = '';
            editingRecipeId = null;
            const saveBtn = document.getElementById('save-recipe-btn');
            if (saveBtn) saveBtn.textContent = 'Save Recipe';
        }
    } catch (error) {
        console.error('Error loading recipes:', error);
    }
}

// Load grinders
async function loadGrinders() {
    console.log('Loading grinders...');
    try {
        const response = await fetch('http://localhost:3000/api/grinders');
        const grinders = await response.json();
        console.log('Loaded grinders:', grinders);

        const savedGrinders = document.getElementById('saved-grinders-grid');
        const grinderInput = document.getElementById('grinder-input');
        if (savedGrinders) {
            savedGrinders.innerHTML = '<option value="">-- Select a saved grinder --</option>';
            grinders.forEach(g => {
                const option = document.createElement('option');
                option.value = g.id;
                option.textContent = g.name;
                option.dataset.grinder = JSON.stringify(g);
                savedGrinders.appendChild(option);
            });
        }
        if (grinderInput) {
            grinderInput.innerHTML = '<option value="">Select grinder</option>' + grinders.map(g => `<option value="${g.name}">${g.name}</option>`).join('');
        }

        const grindersList = document.getElementById('grinders-list');
        if (grindersList) {
            grindersList.innerHTML = '';
            let appendCount = 0;
            grinders.forEach(g => {
                const row = document.createElement('div');
                row.dataset.id = g.id;
                row.className = 'flex justify-between items-center p-2 border rounded-md';
                row.innerHTML = `
                    <div><strong>${g.name}</strong> <span class="text-gray-600 text-sm">${g.notes || ''}</span></div>
                    <div class="flex gap-2">
                        <button class="grinder-edit-btn bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 rounded" data-id="${g.id}">Edit</button>
                        <button class="grinder-delete-btn bg-red-500 hover:bg-red-600 px-2 py-1 rounded text-white" data-id="${g.id}">Delete</button>
                    </div>
                `;
                grindersList.appendChild(row);
                appendCount++;
            });
            // attach handlers
            grindersList.querySelectorAll('.grinder-edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    const sel = document.getElementById('saved-grinders-grid');
                    if (sel) { sel.value = id; editGrinder(); }
                });
            });
            grindersList.querySelectorAll('.grinder-delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    if (!id) return;
                    const sel = document.getElementById('saved-grinders-grid'); if (sel) sel.value = id;
                    await deleteGrinder();
                });
            });
        }
    } catch (err) {
        console.error('Error loading grinders:', err);
    }
}

// Load beans
async function loadBeans() {
    console.log('Loading bean bags...');
    try {
        const response = await fetch('http://localhost:3000/api/beans');
        const beans = await response.json();
        console.log('Loaded beans:', beans);
        const savedBeansSelect = document.getElementById('saved-beans');
        const savedBeansGrid = document.getElementById('saved-beans-grid');
        // Populate saved-beans select and datalist
        if (savedBeansSelect) {
            savedBeansSelect.innerHTML = '<option value="">-- Select saved bag --</option>';
            const datalist = document.getElementById('beans-datalist');
            if (datalist) datalist.innerHTML = '';
            beans.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = `${b.name} (${(typeof b.remaining !== 'undefined' ? b.remaining : b.bagSize)}g left)`;
                opt.dataset.bean = JSON.stringify(b);
                savedBeansSelect.appendChild(opt);
                if (datalist) {
                    const dopt = document.createElement('option');
                    dopt.value = b.name;
                    datalist.appendChild(dopt);
                }
            });
        }
        // Populate saved-beans grid select
        if (savedBeansGrid) {
            savedBeansGrid.innerHTML = '<option value="">-- Select a bean bag --</option>';
            beans.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = `${b.name} (${Math.round((b.remaining / b.bagSize) * 100)}%)`;
                opt.dataset.bean = JSON.stringify(b);
                savedBeansGrid.appendChild(opt);
            });
        }
        // Avoid registering duplicate listeners if refreshAnalytics runs repeatedly
        if (savedBeansSelect && !savedBeansSelect.dataset.changeAttached) {
            savedBeansSelect.addEventListener('change', (e) => {
                const opt = e.target.options[e.target.selectedIndex];
                if (opt && opt.dataset.bean) {
                    const bean = JSON.parse(opt.dataset.bean);
                    const beansInput = document.getElementById('beans-input');
                    if (beansInput) beansInput.value = bean.name;
                    // Set default beans used if possible
                    const beansUsedInput = document.getElementById('beans-used-input');
                    if (beansUsedInput) beansUsedInput.value = '' + computeDefaultBeansUsed();
                    // Populate completion form metadata if present
                    const originInput = document.getElementById('origin-input');
                    const roastInput = document.getElementById('roast-input');
                    const maslInput = document.getElementById('masl-input');
                    if (bean.origin && originInput) originInput.value = bean.origin;
                    if (bean.roast && roastInput) roastInput.value = bean.roast;
                    if (bean.masl && maslInput) maslInput.value = bean.masl;
                }
                console.log('savedBeans select changed ->', savedBeansSelect.value, (savedBeansSelect.options[savedBeansSelect.selectedIndex] && savedBeansSelect.options[savedBeansSelect.selectedIndex].dataset.bean));
            });
            savedBeansSelect.dataset.changeAttached = 'true';
        }
        // update a global bean map for CSV/export lookups and general use
        window._beanMap = {};
        beans.forEach(b => window._beanMap[b.id] = b);
        const beansList = document.getElementById('beans-list');
        if (beansList) {
            beansList.innerHTML = '';
            let beansAppended = 0;
            beans.forEach(b => {
                // Skip duplicates if the beans list already contains this id
                if (beansList.querySelector(`[data-id="${b.id}"]`)) {
                    console.log('Skipping duplicate bean', b.id, b.name);
                    return;
                }
                const row = document.createElement('div');
                row.dataset.id = b.id;
                row.className = 'p-2 border rounded flex items-center justify-between gap-2';
                const pct = b.bagSize && b.remaining !== undefined ? Math.max(0, Math.min(100, Math.round((b.remaining / b.bagSize) * 100))) : 0;
                row.innerHTML = `
                    <div class="flex-1">
                        <div class="font-bold">${b.name}</div>
                        <div class="text-sm text-gray-600">${(typeof b.remaining !== 'undefined' ? b.remaining : b.bagSize)}g / ${b.bagSize}g</div>
                        <div class="w-full bg-gray-200 rounded h-2 mt-2">
                            <div class="bg-amber-600 h-2 rounded" style="width:${pct}%"></div>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button class="bean-edit-btn bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 rounded" data-id="${b.id}">Edit</button>
                        <button class="bean-delete-btn bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded" data-id="${b.id}">Delete</button>
                    </div>
                `;
                beansList.appendChild(row);
                beansAppended++;
            });
            console.log('Appended', beansAppended, 'beans to beansList');
            // hook list buttons
            beansList.querySelectorAll('.bean-edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    const sel = document.getElementById('saved-beans-grid');
                    if (sel) sel.value = id;
                    editBean();
                });
            });
            beansList.querySelectorAll('.bean-delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    if (!id) return;
                    const sel = document.getElementById('saved-beans-grid'); if (sel) sel.value = id;
                    await deleteBean();
                });
            });
        }
    } catch (err) {
        console.error('Error loading beans', err);
    }
}

async function saveBean() {
    const nameInput = document.getElementById('bean-name-grid');
    const bagSizeInput = document.getElementById('bean-bag-size-grid');
    const name = nameInput?.value?.trim();
    const bagSize = parseFloat(bagSizeInput?.value) || 0;
    const remainingStr = document.getElementById('bean-remaining-grid')?.value;
    const remaining = remainingStr !== undefined && remainingStr !== '' ? parseFloat(remainingStr) : undefined;
    const origin = document.getElementById('bean-origin-grid')?.value || '';
    const roast = document.getElementById('bean-roast-grid')?.value || '';
    const masl = document.getElementById('bean-masl-grid')?.value || '';
    if (!name || !bagSize) return alert('Please enter bean name and bag size');
    if (remaining !== undefined && (isNaN(remaining) || remaining < 0 || remaining > bagSize)) return alert('Please enter a valid remaining value between 0 and the bag size');
    const editingId = document.getElementById('editing-bean-id')?.value || null;
    try {
        let resp;
        if (editingId) {
            resp = await fetch(`http://localhost:3000/api/beans/${editingId}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name, bagSize, remaining, origin, roast, masl}) });
        } else {
            resp = await fetch('http://localhost:3000/api/beans', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name, bagSize, remaining, origin, roast, masl}) });
        }
        if (resp.ok) {
            nameInput.value = '';
            bagSizeInput.value = '';
                document.getElementById('bean-origin-grid').value = '';
                document.getElementById('bean-roast-grid').value = '';
                document.getElementById('bean-masl-grid').value = '';
            if (editingId) document.getElementById('editing-bean-id').value = '';
            loadBeans();
            alert(editingId ? 'Bean bag updated' : 'Bean bag saved');
        } else {
            alert('Failed to save bean bag');
        }
    } catch (err) {
        console.error('Error saving bean', err);
        alert('Failed to save bean bag');
    }
}

async function editBean() {
    const savedBeansGrid = document.getElementById('saved-beans-grid');
    if (!savedBeansGrid || !savedBeansGrid.value) return alert('Select a bean bag to edit');
    const selected = savedBeansGrid.options[savedBeansGrid.selectedIndex];
    if (!selected) return;
    const beanData = JSON.parse(selected.dataset.bean);
    document.getElementById('bean-name-grid').value = beanData.name || '';
    document.getElementById('bean-bag-size-grid').value = beanData.bagSize || '';
    document.getElementById('bean-remaining-grid').value = beanData.remaining || '';
    document.getElementById('bean-origin-grid').value = beanData.origin || '';
    document.getElementById('bean-roast-grid').value = beanData.roast || '';
    document.getElementById('bean-masl-grid').value = beanData.masl || '';
    document.getElementById('editing-bean-id').value = beanData.id;
    document.getElementById('save-bean-btn-grid').textContent = 'Update Bean';
}

async function deleteBean() {
    const sel = document.getElementById('saved-beans-grid');
    if (!sel || !sel.value) return alert('Select a bean to delete');
    if (!confirm('Delete this bean bag?')) return;
    try {
        const id = sel.value;
        const resp = await fetch(`http://localhost:3000/api/beans/${id}`, { method: 'DELETE' });
        if (resp.ok) {
            document.getElementById('bean-name-grid').value = '';
            document.getElementById('bean-bag-size-grid').value = '';
            loadBeans();
            alert('Bean bag deleted');
        } else {
            alert('Failed to delete bean bag');
        }
    } catch (err) {
        console.error('Error deleting bean', err);
        alert('Failed to delete bean bag');
    }
}

async function saveGrinder() {
    const nameInput = document.getElementById('grinder-name-grid');
    const notesInput = document.getElementById('grinder-notes-grid');
    const name = nameInput?.value?.trim();
    const notes = notesInput?.value?.trim();
    if (!name) return alert('Please enter a grinder name');
    try {
        let resp;
        if (editingGrinderId) {
            // update
            resp = await fetch(`http://localhost:3000/api/grinders/${editingGrinderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, notes })
            });
        } else {
            resp = await fetch('http://localhost:3000/api/grinders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, notes })
            });
        }
        if (resp.ok) {
            nameInput.value = '';
            notesInput.value = '';
            const wasEditing = !!editingGrinderId;
            document.getElementById('editing-grinder-id').value = '';
            editingGrinderId = null;
            const saveBtn = document.getElementById('save-grinder-btn-grid');
            if (saveBtn) saveBtn.textContent = 'Save Grinder';
            loadGrinders();
            alert(wasEditing ? 'Grinder updated' : 'Grinder saved');
        } else {
            alert('Failed to save grinder');
        }
    } catch (err) {
        console.error('Error saving grinder', err);
        alert('Failed to save grinder');
    }
}

async function deleteGrinder() {
    const savedGrinders = document.getElementById('saved-grinders-grid');
    if (!savedGrinders || !savedGrinders.value) return alert('Select a grinder to delete');
    if (!confirm('Are you sure you want to delete this grinder?')) return;
    try {
        const id = savedGrinders.value;
        const resp = await fetch(`http://localhost:3000/api/grinders/${id}`, { method: 'DELETE' });
        if (resp.ok) {
            loadGrinders();
            alert('Grinder deleted');
        } else {
            alert('Failed to delete grinder');
        }
    } catch (err) {
        console.error('Error deleting grinder', err);
        alert('Failed to delete grinder');
    }
}

async function editGrinder() {
    const savedGrinders = document.getElementById('saved-grinders-grid');
    if (!savedGrinders || !savedGrinders.value) return alert('Select a grinder to edit');
    const selected = savedGrinders.options[savedGrinders.selectedIndex];
    if (!selected) return;
    const grinderData = JSON.parse(selected.dataset.grinder);
    document.getElementById('grinder-name-grid').value = grinderData.name || '';
    document.getElementById('grinder-notes-grid').value = grinderData.notes || '';
    document.getElementById('editing-grinder-id').value = grinderData.id;
    editingGrinderId = grinderData.id;
    const saveBtn = document.getElementById('save-grinder-btn-grid');
    if (saveBtn) saveBtn.textContent = 'Update Grinder';
}

let editingRecipeId = null;
async function saveRecipe() {
    console.log('Saving recipe...');
    const recipeName = document.getElementById('recipe-name').value || 'Custom Recipe';
    
    // build stages dynamically based on selected stage-count
    const stageCount = parseInt((document.getElementById('stage-count') && document.getElementById('stage-count').value) || '4');
    const stages = [];
    for (let i = 1; i <= Math.min(5, Math.max(1, stageCount)); i++) {
        const timeEl = document.getElementById(`stage${i}-time`);
        const waterEl = document.getElementById(`stage${i}-water`);
        const dur = timeEl ? parseInt(timeEl.value) || 45 : 45;
        const water = waterEl ? parseInt(waterEl.value) || 100 : 100;
        let name = 'Pour ' + i;
        if (i === 1) name = 'Bloom';
        if (i === stageCount && i > 1) name = 'Final Pour';
        stages.push({ name, duration: dur, waterAmount: water });
    }
    
    try {
        // If editingRecipeId is set, update instead of creating a new one
        const existingId = document.getElementById('editing-recipe-id')?.value || editingRecipeId;
        if (existingId) {
                    // If no editing id is set, check if a recipe with the same name and stages exists
                    // to avoid creating duplicates when user saves an unchanged recipe.
                    try {
                        const checkResp = await fetch('http://localhost:3000/api/recipes');
                        if (checkResp.ok) {
                            const recipes = await checkResp.json();
                            const matching = recipes.find(r => r.name === recipeName && JSON.stringify(r.stages) === JSON.stringify(stages));
                            if (matching) {
                                // Update the matching recipe rather than create a new one
                                const response = await fetch(`http://localhost:3000/api/recipes/${matching.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ name: recipeName, stages })
                                });
                                if (response.ok) {
                                    alert('Recipe updated successfully (match by content)');
                                    loadRecipes();
                                    return;
                                }
                            }
                        }
                    } catch (err) {
                        console.warn('Error checking for duplicate recipe before create', err);
                    }
            // Update
            const response = await fetch(`http://localhost:3000/api/recipes/${existingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: recipeName, stages })
            });
            if (response.ok) {
                alert('Recipe updated successfully');
                document.getElementById('editing-recipe-id').value = '';
                editingRecipeId = null;
                loadRecipes();
                return;
            } else {
                console.error('Failed to update recipe');
            }
        }
        const response = await fetch('http://localhost:3000/api/recipes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: recipeName, stages })
        });
        
        if (response.ok) {
            console.log('Recipe saved successfully');
            alert('Recipe saved successfully!');
            loadRecipes();
        } else {
            console.error('Failed to save recipe');
        }
    } catch (error) {
        console.error('Error saving recipe:', error);
        alert('Failed to save recipe');
    }
}

function applyRecipe() {
    console.log('Applying recipe...');
    
    // Update pourStages from form inputs (dynamic, can support 1-5 pours)
    const stageCount = parseInt((document.getElementById('stage-count') && document.getElementById('stage-count').value) || '4');
    const newStages = [];
    for (let i = 1; i <= Math.min(5, Math.max(1, stageCount)); i++) {
        const timeEl = document.getElementById(`stage${i}-time`);
        const waterEl = document.getElementById(`stage${i}-water`);
        const dur = timeEl ? parseInt(timeEl.value) || 45 : 45;
        const water = waterEl ? parseInt(waterEl.value) || 100 : 100;
        let name = `Pour ${i}`;
        if (i === 1) name = 'Bloom';
        if (i === stageCount && i > 1) name = 'Final Pour';
        const instruction = `Pour ${i}: ${water} grams` + (i === 1 ? ' (Bloom)' : '');
        newStages.push({ name, duration: dur, waterAmount: water, instruction });
    }
    pourStages = newStages;
    
    console.log('Recipe applied:', pourStages);
    // update indicators for new stage count
    renderStageIndicators();
    
    // Hide recipe modal
    const recipeModal = document.getElementById('recipe-modal');
    if (recipeModal) {
        recipeModal.classList.add('hidden');
    }
    
    // Reset timer if it was running
    if (isRunning || currentStageIndex > 0 || timeRemaining > 0) {
        resetTimer();
    }
    
    alert('Recipe applied! Ready to start brewing.');
}

function loadRecipeFromSelect() {
    const savedRecipes = document.getElementById('saved-recipes');
    const selectedOption = savedRecipes.options[savedRecipes.selectedIndex];
    
    if (selectedOption.value && selectedOption.dataset.recipe) {
        const recipe = JSON.parse(selectedOption.dataset.recipe);
        console.log('Loading recipe:', recipe);
        
        document.getElementById('recipe-name').value = recipe.name;
        document.getElementById('editing-recipe-id').value = recipe.id;
        editingRecipeId = recipe.id;
        // Adjust button to indicate editing
        const saveBtn = document.getElementById('save-recipe-btn');
        if (saveBtn) saveBtn.textContent = 'Update Recipe';
        
        // Set stage count and populate fields
        const stageCountSel = document.getElementById('stage-count');
        const cnt = recipe.stages && recipe.stages.length ? recipe.stages.length : 4;
        if (stageCountSel) {
            stageCountSel.value = `${cnt}`;
        }
        // Ensure setup inputs reflect desired count
        if (typeof renderStageSetupInputs === 'function') renderStageSetupInputs();
        if (typeof renderStageIndicators === 'function') renderStageIndicators();
        recipe.stages.forEach((stage, idx) => {
            const timeEl = document.getElementById(`stage${idx + 1}-time`);
            const waterEl = document.getElementById(`stage${idx + 1}-water`);
            if (timeEl) timeEl.value = stage.duration;
            if (waterEl) waterEl.value = stage.waterAmount;
        });
    }
}

// Event Listeners
console.log('Setting up event listeners...');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const quickLogBtn = document.getElementById('quick-log-btn');
    const saveBrewBtn = document.getElementById('save-brew-btn');
    const ratingBtns = document.querySelectorAll('.rating-btn');
    const customizeBtn = document.getElementById('customize-btn');
    const saveRecipeBtn = document.getElementById('save-recipe-btn');
    const applyRecipeBtn = document.getElementById('apply-recipe-btn');
    const cancelRecipeBtn = document.getElementById('cancel-recipe-btn');
    const savedRecipesSelect = document.getElementById('saved-recipes');
    const savedGrindersSelect = document.getElementById('saved-grinders-grid');
    const saveGrinderBtn = document.getElementById('save-grinder-btn-grid');
    const deleteGrinderBtn = document.getElementById('delete-grinder-btn-grid');
    const editGrinderBtn = document.getElementById('edit-grinder-btn-grid');
    const manageGrindersBtn = document.getElementById('manage-grinders-btn');
    const manageBeansBtn = document.getElementById('manage-beans-btn');
    const saveBeanBtn = document.getElementById('save-bean-btn-grid');
    const deleteBeanBtn = document.getElementById('delete-bean-btn-grid');
    const editBeanBtn = document.getElementById('edit-bean-btn-grid');
    
    console.log('Elements found:', {
        startBtn: !!startBtn,
        resetBtn: !!resetBtn,
        saveBrewBtn: !!saveBrewBtn,
        ratingBtns: ratingBtns.length,
        customizeBtn: !!customizeBtn
    });
    
    if (startBtn) {
        console.log('Adding click listener to start button');
        startBtn.addEventListener('click', () => {
            console.log('Start button clicked!');
            if (isRunning) {
                pauseTimer();
            } else {
                startTimer();
            }
        });
    } else {
        console.error('Start button not found!');
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', resetTimer);
    }
    if (quickLogBtn) {
        quickLogBtn.addEventListener('click', () => {
            console.log('Quick Log button clicked - opening completion form');
            // Ensure the timer isn't accidentally left running
            if (isRunning) pauseTimer();
            showCompletionForm();
        });
    }
    
    if (saveBrewBtn) {
        // Attach central handler and mark attached to avoid duplicate binding
        if (!saveBrewBtn.dataset.saveAttached) {
            saveBrewBtn.addEventListener('click', handleSaveBrewClick);
            saveBrewBtn.dataset.saveAttached = 'true';
        }
        console.log('saveBrewBtn.dataset.saveAttached (DOMContentLoaded):', saveBrewBtn.dataset.saveAttached);
    }
    // Fallback: delegate clicks for dynamic button (in case the button is replaced)
    if (!document.body.dataset.saveDelegateAttached) {
        document.body.addEventListener('click', (e) => {
            const target = e.target;
            if (!target) return;
            // If the event target is the button or any descendant, ensure we don't double-invoke
            const btn = target.id === 'save-brew-btn' ? target : target.closest('#save-brew-btn');
            if (btn) {
                // If the element itself has an attached handler, do not call via delegation
                if (btn.dataset && btn.dataset.saveAttached) return;
                handleSaveBrewClick();
            }
        });
        document.body.dataset.saveDelegateAttached = 'true';
        console.log('document.body.dataset.saveDelegateAttached:', document.body.dataset.saveDelegateAttached);
    }
    
    // Rating button handlers
    ratingBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget;
            const rating = target.getAttribute('data-rating');
            const ratingValue = document.getElementById('rating-value');
            
            if (ratingValue && rating) {
                ratingValue.value = rating;
                
                // Visual feedback
                ratingBtns.forEach((b, idx) => {
                    if (idx < parseInt(rating)) {
                        b.classList.remove('opacity-50');
                    } else {
                        b.classList.add('opacity-50');
                    }
                });
            }
        });
    });
    
    // Recipe customization handlers
    if (customizeBtn) {
        customizeBtn.addEventListener('click', () => {
            console.log('Customize button clicked');
            const recipeModal = document.getElementById('recipe-modal');
            if (recipeModal) {
                recipeModal.classList.remove('hidden');
                loadRecipes();
            }
        });
    }
    
    if (saveRecipeBtn) {
        saveRecipeBtn.addEventListener('click', saveRecipe);
    }
    const deleteRecipeBtn = document.getElementById('delete-recipe-btn');
    if (deleteRecipeBtn) {
        deleteRecipeBtn.addEventListener('click', async () => {
            const savedRecipes = document.getElementById('saved-recipes');
            if (!savedRecipes || !savedRecipes.value) return alert('Select a recipe to delete');
            if (!confirm('Are you sure you want to delete this recipe?')) return;
            try {
                const id = savedRecipes.value;
                console.log('Attempting to delete recipe id=', id);
                const resp = await fetch(`http://localhost:3000/api/recipes/${id}`, { method: 'DELETE' });
                console.log('Delete response status:', resp.status, resp.statusText);
                if (resp.ok) {
                    document.getElementById('editing-recipe-id').value = '';
                    editingRecipeId = null;
                    const saveBtn = document.getElementById('save-recipe-btn');
                    if (saveBtn) saveBtn.textContent = 'Save Recipe';
                    loadRecipes();
                    alert('Recipe deleted');
                } else {
                    const text = await resp.text();
                    console.error('Delete recipe failed:', resp.status, text);
                    alert(`Failed to delete recipe: ${resp.status} ${resp.statusText} - ${text}`);
                }
            } catch (err) {
                console.error('Error deleting recipe', err);
                alert('Failed to delete recipe (network error, see console)');
            }
        });
    }
    
    if (applyRecipeBtn) {
        applyRecipeBtn.addEventListener('click', applyRecipe);
    }
    
    if (cancelRecipeBtn) {
        cancelRecipeBtn.addEventListener('click', () => {
            const recipeModal = document.getElementById('recipe-modal');
            if (recipeModal) {
                recipeModal.classList.add('hidden');
            }
        });
    }
    
    if (savedRecipesSelect) {
        savedRecipesSelect.addEventListener('change', loadRecipeFromSelect);
    }
    if (savedGrindersSelect) {
        savedGrindersSelect.addEventListener('change', (e) => {
            const opt = e.target.options[e.target.selectedIndex];
            if (opt && opt.dataset.grinder) {
                const grinder = JSON.parse(opt.dataset.grinder);
                const grinderInput = document.getElementById('grinder-input');
                if (grinderInput) { grinderInput.value = grinder.name; }
            }
        });
    }
    if (saveGrinderBtn) {
        saveGrinderBtn.addEventListener('click', saveGrinder);
    }
    if (deleteGrinderBtn) {
        deleteGrinderBtn.addEventListener('click', deleteGrinder);
    }
    if (editGrinderBtn) {
        editGrinderBtn.addEventListener('click', editGrinder);
    }
    if (saveBeanBtn) {
        saveBeanBtn.addEventListener('click', saveBean);
    }
    if (deleteBeanBtn) {
        deleteBeanBtn.addEventListener('click', deleteBean);
    }
    if (editBeanBtn) {
        editBeanBtn.addEventListener('click', editBean);
    }
    if (manageGrindersBtn) {
        manageGrindersBtn.addEventListener('click', () => {
            if (grindersTab) {
                setActiveTab(grindersTab);
                showContent(grindersContent);
            }
            loadGrinders();
        });
    }
    if (manageBeansBtn) {
        manageBeansBtn.addEventListener('click', () => {
            if (beansTab) {
                setActiveTab(beansTab);
                showContent(beansContent);
            }
            loadBeans();
        });
    }
    
    // Tab switching
    const timerTab = document.getElementById('timer-tab');
    const analyticsTab = document.getElementById('analytics-tab');
    const grindersTab = document.getElementById('grinders-tab');
    const beansTab = document.getElementById('beans-tab');
    const timerContent = document.getElementById('timer-content');
    const analyticsContent = document.getElementById('analytics-content');
    const grindersContent = document.getElementById('grinders-content');
    const beansContent = document.getElementById('beans-content');
    
    function setActiveTab(activeBtn) {
        const tabs = [timerTab, analyticsTab, grindersTab, beansTab];
        tabs.forEach(t => {
            if (!t) return;
            t.classList.remove('bg-amber-600', 'text-white');
            t.classList.add('text-gray-700', 'hover:bg-gray-100');
        });
        if (activeBtn) {
            activeBtn.classList.add('bg-amber-600', 'text-white');
            activeBtn.classList.remove('text-gray-700', 'hover:bg-gray-100');
        }
    }
    function showContent(activeContent) {
        const contents = [timerContent, analyticsContent, grindersContent, beansContent];
        contents.forEach(c => { if (c) c.classList.remove('active'); });
        if (activeContent) activeContent.classList.add('active');
    }

    if (timerTab) {
        timerTab.addEventListener('click', () => {
            setActiveTab(timerTab);
            showContent(timerContent);
        });
    }
    
    if (analyticsTab) {
        analyticsTab.addEventListener('click', () => {
            setActiveTab(analyticsTab);
            showContent(analyticsContent);
            
            // Load analytics data
            refreshAnalytics();
            // Ensure charts resize correctly after tab becomes visible
            setTimeout(() => {
                try {
                    if (analyticsChart) analyticsChart.resize();
                    if (window.ratingChart) window.ratingChart.resize();
                    if (window.trendChart) window.trendChart.resize();
                } catch (err) {
                    // Chart.js may not be loaded yet on very tiny screens; ignore resize errors
                    console.warn('Error resizing charts:', err);
                }
            }, 250);
        });
    }

    if (grindersTab) {
        grindersTab.addEventListener('click', () => {
            setActiveTab(grindersTab);
            showContent(grindersContent);
            loadGrinders();
        });
    }
    if (beansTab) {
        beansTab.addEventListener('click', () => {
            console.log('Beans tab clicked');
                setActiveTab(beansTab);
                showContent(beansContent);
                loadBeans();
        });
    }
    
    // Analytics filter handlers
    const originFilter = document.getElementById('filter-origin');
    const roastFilter = document.getElementById('filter-roast');
    const beansFilter = document.getElementById('filter-beans');
    const grinderFilter = document.getElementById('filter-grinder');
    const ratingFilter = document.getElementById('filter-rating');
    const sortByFilter = document.getElementById('sort-by');
    
    if (originFilter) {
        originFilter.addEventListener('change', refreshAnalytics);
    }
    if (roastFilter) {
        roastFilter.addEventListener('change', refreshAnalytics);
    }
    if (beansFilter) {
        beansFilter.addEventListener('change', refreshAnalytics);
    }
    if (ratingFilter) {
        ratingFilter.addEventListener('change', refreshAnalytics);
    }
    if (sortByFilter) {
        sortByFilter.addEventListener('change', refreshAnalytics);
    }
    if (grinderFilter) {
        grinderFilter.addEventListener('change', refreshAnalytics);
    }
    const analyticsRefreshBtn = document.getElementById('analytics-refresh');
    if (analyticsRefreshBtn) {
        analyticsRefreshBtn.addEventListener('click', () => {
            refreshAnalytics();
        });
    }
    const analyticsExportBtn = document.getElementById('analytics-export');
    if (analyticsExportBtn) {
        analyticsExportBtn.addEventListener('click', () => {
            exportFilteredCsv();
        });
    }
    
    // Load previous brews on page load
    loadBrews();
    // Load saved recipes, grinders and bean bags
    loadRecipes();
    loadGrinders();
    loadBeans();
    // Configure stage count selector to reflect default pourStages length
    const stageCountSel = document.getElementById('stage-count');
    if (stageCountSel) {
        stageCountSel.value = `${(Array.isArray(pourStages) && pourStages.length) ? pourStages.length : 4}`;
        stageCountSel.addEventListener('change', () => {
            renderStageSetupInputs();
            renderStageIndicators();
        });
    }
    renderStageSetupInputs();
    renderStageIndicators();
    // Pre-populate analytics data so charts/filters are available
    refreshAnalytics();
    
    console.log('Event listeners setup complete');
});

// Analytics functions
let analyticsChart = null;
let grinderChart = null;
async function refreshAnalytics() {
    console.log('refreshAnalytics: starting');
    try {
        const response = await fetch('http://localhost:3000/api/brews');
        const brews = await response.json();
        console.log('refreshAnalytics: fetched', brews.length, 'brews');

        // Populate filter dropdowns
        populateAnalyticsFilters(brews);

        // Apply filters and sorting
        const filteredBrews = filterBrews(brews);

        // Calculate and display stats
        calculateStats(filteredBrews);

        // Render chart
        renderAnalyticsChart(filteredBrews);

        // Render filtered brew list
        renderAnalyticsList(filteredBrews);
        // Update export button enabled state
        const analyticsExportBtn = document.getElementById('analytics-export');
        if (analyticsExportBtn) analyticsExportBtn.disabled = !filteredBrews || filteredBrews.length === 0;

        // Generate insights
        generateInsights(filteredBrews);
    } catch (error) {
        console.error('Error refreshing analytics:', error);
    }
}

function populateAnalyticsFilters(brews) {
    // Get unique origins and roasts
    const originSet = new Set();
    const roastSet = new Set();
    const grinderSet = new Set();
    const beansSet = new Set();
    brews.forEach(brew => {
        if (brew.origin) originSet.add(brew.origin);
        if (brew.roast) roastSet.add(brew.roast);
        if (brew.beans) beansSet.add(brew.beans);
        if (brew.grinder) grinderSet.add(brew.grinder);
    });
    const originFilter = document.getElementById('filter-origin');
    const roastFilter = document.getElementById('filter-roast');
    const beansFilter = document.getElementById('filter-beans');
    const ratingFilter = document.getElementById('filter-rating');
    const grinderFilter = document.getElementById('filter-grinder');
    if (originFilter || roastFilter || ratingFilter || beansFilter) {
        // preserve current selections
        const currentOrigin = originFilter ? originFilter.value : '';
        const currentRoast = roastFilter ? roastFilter.value : '';
        const currentRating = ratingFilter ? ratingFilter.value : '';
        const currentBeans = beansFilter ? beansFilter.value : '';
        const currentGrinder = grinderFilter ? grinderFilter.value : '';

        if (originFilter) {
            originFilter.innerHTML = '<option value="">All Origins</option>' +
                Array.from(originSet).map(origin => `<option value="${origin}">${origin}</option>`).join('');
            originFilter.value = currentOrigin || '';
        }
        if (beansFilter) {
            beansFilter.innerHTML = '<option value="">All Beans</option>' +
                Array.from(beansSet).map(b => `<option value="${b}">${b}</option>`).join('');
            beansFilter.value = currentBeans || '';
        }
        if (roastFilter) {
            roastFilter.innerHTML = '<option value="">All Roasts</option>' +
                Array.from(roastSet).map(roast => `<option value="${roast}">${roast}</option>`).join('');
            roastFilter.value = currentRoast || '';
        }
        if (ratingFilter) {
            // ratingFilter is static except for preserving selection
            ratingFilter.value = currentRating || '';
        }
        if (grinderFilter) {
            grinderFilter.innerHTML = '<option value="">All Grinders</option>' +
                Array.from(grinderSet).map(g => `<option value="${g}">${g}</option>`).join('');
            grinderFilter.value = currentGrinder || '';
        }
    }
    const savedBeansGrid = document.getElementById('saved-beans-grid');
    if (savedBeansGrid) {
        savedBeansGrid.addEventListener('change', (e) => {
            const opt = savedBeansGrid.options[savedBeansGrid.selectedIndex];
            if (opt && opt.dataset.bean) {
                const bean = JSON.parse(opt.dataset.bean);
                document.getElementById('bean-name-grid').value = bean.name || '';
                document.getElementById('bean-bag-size-grid').value = bean.bagSize || '';
            }
        });
    }
    // saved-beans select and input mapping are handled in loadBeans(); no further wiring required here
}

function renderAnalyticsChart(brews) {
    const ctx = document.getElementById('analytics-chart').getContext('2d');
    const ratingCtxEl = document.getElementById('rating-chart');
    const ratingCtx = ratingCtxEl ? ratingCtxEl.getContext('2d') : null;
    // Example: Brew count by origin
    const originCounts = {};
    const ratingCounts = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
    brews.forEach(brew => {
        const originLabel = brew.origin || brew.beans || 'Unknown';
        originCounts[originLabel] = (originCounts[originLabel] || 0) + 1;
        if (brew.rating !== undefined && brew.rating !== null) {
            const r = Math.round(brew.rating);
            if (typeof ratingCounts[r] !== 'undefined') {
                ratingCounts[r]++;
            }
        }
    });
    const chartData = {
        labels: Object.keys(originCounts),
        datasets: [
            {
                label: 'Brews by Origin',
                data: Object.values(originCounts),
                backgroundColor: 'rgba(251, 191, 36, 0.7)',
                borderColor: 'rgba(251, 191, 36, 1)',
                borderWidth: 2,
            }
        ]
    };
    const ratingColorsMap = { '5': '#16a34a', '4': '#22c55e', '3': '#f59e0b', '2': '#f97316', '1': '#ef4444' };
    const ratingData = {
        labels: Object.keys(ratingCounts).map(r => r + ' Stars'),
        datasets: [
            {
                label: 'Rating Distribution',
                data: Object.values(ratingCounts),
                backgroundColor: Object.keys(ratingCounts).map(k => ratingColorsMap[k] || 'rgba(59, 130, 246, 0.7)'),
                borderColor: Object.keys(ratingCounts).map(k => ratingColorsMap[k] ? ratingColorsMap[k] : 'rgba(59, 130, 246, 1)'),
                borderWidth: 2,
            }
        ]
    };
    // Grinder chart: counts & avg rating per grinder
    const grinderCounts = {};
    const grinderRatings = {};
    const grinderGrindSize = {};
    brews.forEach(brew => {
        const g = brew.grinder || 'Unknown';
        grinderCounts[g] = (grinderCounts[g] || 0) + 1;
        if (brew.rating !== undefined && brew.rating !== null) {
            if (!grinderRatings[g]) grinderRatings[g] = { total: 0, count: 0 };
            grinderRatings[g].total += brew.rating; grinderRatings[g].count++;
        }
        if (brew.grindSize !== undefined && brew.grindSize !== null) {
            if (!grinderGrindSize[g]) grinderGrindSize[g] = { total: 0, count: 0 };
            grinderGrindSize[g].total += parseFloat(brew.grindSize);
            grinderGrindSize[g].count++;
        }
    });
    const grinderLabels = Object.keys(grinderCounts);
    const grinderCountValues = grinderLabels.map(l => grinderCounts[l]);
    const grinderAvgRatingValues = grinderLabels.map(l => grinderRatings[l] ? Number((grinderRatings[l].total / grinderRatings[l].count).toFixed(2)) : 0);
    const grinderAvgGrindValues = grinderLabels.map(l => grinderGrindSize[l] ? Number((grinderGrindSize[l].total / grinderGrindSize[l].count).toFixed(1)) : 0);
    // If canvas width is zero (e.g., hidden tab), wait and retry
    if (ctx.canvas.offsetWidth === 0) {
        setTimeout(() => renderAnalyticsChart(brews), 200);
        return;
    }
    // Destroy previous chart if exists
    if (analyticsChart) analyticsChart.destroy();
    // If no origins, render a placeholder
    if (Object.keys(originCounts).length === 0) {
        // Clear canvas and show a no-data overlay
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'center';
        ctx.fillText('No origin data available', ctx.canvas.width / 2, ctx.canvas.height / 2);
    } else {
        analyticsChart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Brews by Origin' }
                },
                scales: {
                    x: { title: { display: true, text: 'Origin' } },
                    y: { title: { display: true, text: 'Brews' }, beginAtZero: true }
                }
            }
        });
    }
    // Render rating distribution (secondary chart)
    if (ratingCtx) {
        if (window.ratingChart) window.ratingChart.destroy();
        // If no ratings data, display placeholder
        const ratingTotal = Object.values(ratingCounts).reduce((a, b) => a + b, 0);
        if (ratingTotal === 0) {
            ratingCtx.clearRect(0, 0, ratingCtx.canvas.width, ratingCtx.canvas.height);
            ratingCtx.font = '14px sans-serif';
            ratingCtx.fillStyle = '#6b7280';
            ratingCtx.textAlign = 'center';
            ratingCtx.fillText('No rating data available', ratingCtx.canvas.width / 2, ratingCtx.canvas.height / 2);
        } else {
            window.ratingChart = new Chart(ratingCtx, {
            type: 'pie',
            data: ratingData,
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    title: { display: true, text: 'Rating Distribution' }
                }
            }
            });
        }
    }
    // Render grinder chart
    const grinderCtxEl = document.getElementById('grinder-chart');
    if (grinderCtxEl) {
        const gCtx = grinderCtxEl.getContext('2d');
        if (grinderChart) grinderChart.destroy();
        if (grinderLabels.length === 0) {
            gCtx.clearRect(0, 0, gCtx.canvas.width, gCtx.canvas.height);
            gCtx.font = '14px sans-serif'; gCtx.fillStyle = '#6b7280'; gCtx.textAlign = 'center';
            gCtx.fillText('No grinder data available', gCtx.canvas.width / 2, gCtx.canvas.height / 2);
        } else {
            grinderChart = new Chart(gCtx, {
                type: 'bar',
                data: {
                    labels: grinderLabels,
                    datasets: [
                        {
                            type: 'bar',
                            label: 'Brew Count',
                            data: grinderCountValues,
                            backgroundColor: 'rgba(59, 130, 246, 0.7)'
                        },
                        {
                            type: 'line',
                            label: 'Avg Rating',
                            yAxisID: 'ratingAxis',
                            data: grinderAvgRatingValues,
                            borderColor: 'rgba(245, 158, 11, 1)',
                            backgroundColor: 'rgba(245, 158, 11, 0.2)'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: 'Brew Count' } },
                        ratingAxis: { type: 'linear', position: 'right', beginAtZero: true, max: 5, title: { display: true, text: 'Avg Rating' } }
                    },
                    plugins: {
                        title: { display: true, text: 'Grinder Usage & Avg Rating' },
                        legend: { position: 'bottom' }
                    }
                    ,
                    onClick: function(evt, elements) {
                        if (elements && elements.length > 0) {
                            const idx = elements[0].index;
                            const grinderName = grinderLabels[idx];
                            const gf = document.getElementById('filter-grinder');
                            if (gf) {
                                gf.value = grinderName;
                                refreshAnalytics();
                            }
                        }
                    }
                }
            });
        }
        // Also render grinder stats table summary
        const grinderStatsDiv = document.getElementById('grinder-stats');
        if (grinderStatsDiv) {
            if (grinderLabels.length === 0) {
                grinderStatsDiv.innerHTML = '<p class="text-gray-500">No grinder data available</p>';
            } else {
                grinderStatsDiv.innerHTML = '<table class="w-full text-sm text-left"><thead class="text-xs text-gray-500"><tr><th>Grinder</th><th>Brews</th><th>Avg Rating</th><th>Avg Grind</th></tr></thead><tbody>' +
                    grinderLabels.map((g, idx) => `<tr><td>${g}</td><td>${grinderCountValues[idx]}</td><td>${grinderAvgRatingValues[idx] ? grinderAvgRatingValues[idx].toFixed(2) : '-'}</td><td>${grinderAvgGrindValues[idx] ? grinderAvgGrindValues[idx].toFixed(1) : '-'}</td></tr>`).join('') +
                    '</tbody></table>';
            }
        }
    }
    // Grind size histogram
    const grindSizeCtxEl = document.getElementById('grindsize-chart');
    if (grindSizeCtxEl) {
        const gstCtx = grindSizeCtxEl.getContext('2d');
        // Buckets: 0-2,2-4,4-6,6-8,8-10,10+
        const buckets = [0,2,4,6,8,10];
        const bucketLabels = ['0-2','2-4','4-6','6-8','8-10','10+'];
        const bucketCounts = [0,0,0,0,0,0];
        brews.forEach(b => {
            if (b.grindSize !== undefined && b.grindSize !== null && !isNaN(b.grindSize)) {
                const v = parseFloat(b.grindSize);
                let placed = false;
                for (let i = 0; i < buckets.length; i++) {
                    if (v < buckets[i]) { bucketCounts[i]++; placed = true; break; }
                }
                if (!placed) bucketCounts[bucketCounts.length - 1]++;
            }
        });
        if (window.grindSizeChart) window.grindSizeChart.destroy();
        const totalGrinds = bucketCounts.reduce((a,b) => a + b, 0);
        if (totalGrinds === 0) {
            gstCtx.clearRect(0,0,gstCtx.canvas.width,gstCtx.canvas.height);
            gstCtx.font = '14px sans-serif'; gstCtx.fillStyle = '#6b7280'; gstCtx.textAlign = 'center';
            gstCtx.fillText('No grind size data available', gstCtx.canvas.width / 2, gstCtx.canvas.height / 2);
        } else {
            window.grindSizeChart = new Chart(gstCtx, {
                type: 'bar',
                data: { labels: bucketLabels, datasets: [{ label: 'Brew Count', data: bucketCounts, backgroundColor: 'rgba(168, 85, 247, 0.7)' }] },
                options: { responsive: true, plugins: { title: { display: true, text: 'Grind Size Distribution (g)' } }, scales: { y: { beginAtZero: true } } }
            });
        }
    }
    // Add rating chart below (optional: can toggle between charts)
    // Example: show rating distribution as a second chart
    // ...existing code...
}

function filterBrews(brews) {
    const originFilter = document.getElementById('filter-origin');
    const roastFilter = document.getElementById('filter-roast');
    const ratingFilter = document.getElementById('filter-rating');
    const beansFilter = document.getElementById('filter-beans');
    const grinderFilter = document.getElementById('filter-grinder');
    const sortBy = document.getElementById('sort-by');
    let filtered = brews;
    if (originFilter && originFilter.value) {
        filtered = filtered.filter(brew => brew.origin === originFilter.value);
    }
    if (roastFilter && roastFilter.value) {
        filtered = filtered.filter(brew => brew.roast === roastFilter.value);
    }
    if (beansFilter && beansFilter.value) {
        filtered = filtered.filter(brew => brew.beans === beansFilter.value);
    }
    if (grinderFilter && grinderFilter.value) {
        filtered = filtered.filter(brew => brew.grinder === grinderFilter.value);
    }
    if (ratingFilter && ratingFilter.value) {
        const val = parseInt(ratingFilter.value);
        filtered = filtered.filter(brew => brew.rating >= val);
    }
    // Sorting
    if (sortBy && sortBy.value) {
        if (sortBy.value === 'date-desc') {
            filtered = filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } else if (sortBy.value === 'date-asc') {
            filtered = filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        } else if (sortBy.value === 'rating-desc') {
            filtered = filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (sortBy.value === 'rating-asc') {
            filtered = filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        }
    }
    return filtered;
}

function calculateStats(brews) {
    const totalBrews = document.getElementById('stat-total');
    const avgRating = document.getElementById('stat-avg-rating');
    const favoriteOrigin = document.getElementById('stat-top-origin');
    const favoriteRoast = document.getElementById('stat-fav-roast');
    const topRecipeEl = document.getElementById('stat-top-recipe');
    const topBeansEl = document.getElementById('stat-top-beans');
    const topGrinderEl = document.getElementById('stat-top-grinder');
    const avgGrindEl = document.getElementById('stat-avg-grind');
    const avgWaterEl = document.getElementById('stat-avg-water');
    const avgTimeEl = document.getElementById('stat-avg-time');
    
    if (totalBrews) {
        totalBrews.textContent = brews.length;
    }
    
    if (avgRating && brews.length > 0) {
        const avg = brews.reduce((sum, brew) => sum + (brew.rating || 0), 0) / brews.length;
        avgRating.textContent = avg.toFixed(1);
    } else if (avgRating) {
        avgRating.textContent = '-';
    }
    
    if (favoriteOrigin) {
        const origins = {};
        brews.forEach(brew => {
            if (brew.origin) {
                origins[brew.origin] = (origins[brew.origin] || 0) + 1;
            }
        });
        const topOrigin = Object.entries(origins).sort((a, b) => b[1] - a[1])[0];
        favoriteOrigin.textContent = topOrigin ? topOrigin[0] : '-';
    }
    
    if (favoriteRoast) {
        const roasts = {};
        brews.forEach(brew => {
            if (brew.roast) {
                roasts[brew.roast] = (roasts[brew.roast] || 0) + 1;
            }
        });
        const topRoast = Object.entries(roasts).sort((a, b) => b[1] - a[1])[0];
        favoriteRoast.textContent = topRoast ? topRoast[0] : '-';
    }
    // Top Recipe by average rating
    if (topRecipeEl) {
        const recipeRatings = {};
        brews.forEach(brew => {
            if (brew.recipe && brew.recipe.name && brew.rating) {
                if (!recipeRatings[brew.recipe.name]) recipeRatings[brew.recipe.name] = { total: 0, count: 0 };
                recipeRatings[brew.recipe.name].total += brew.rating;
                recipeRatings[brew.recipe.name].count += 1;
            }
        });
        const topRecipe = Object.entries(recipeRatings)
            .map(([name, data]) => ({ name, avg: data.total / data.count }))
            .sort((a, b) => b.avg - a.avg)[0];
        topRecipeEl.textContent = topRecipe ? `${topRecipe.name} (${topRecipe.avg.toFixed(1)}★)` : '-';
    }
    // Top beans by average rating
    if (topBeansEl) {
        const beanRatings = {};
        brews.forEach(brew => {
            if (brew.beans && brew.rating) {
                if (!beanRatings[brew.beans]) beanRatings[brew.beans] = { total: 0, count: 0 };
                beanRatings[brew.beans].total += brew.rating;
                beanRatings[brew.beans].count += 1;
            }
        });
        const topBean = Object.entries(beanRatings)
            .map(([name, data]) => ({ name, avg: data.total / data.count }))
            .sort((a, b) => b.avg - a.avg)[0];
        topBeansEl.textContent = topBean ? `${topBean.name} (${topBean.avg.toFixed(1)}★)` : '-';
    }
    // Top grinder by average rating
    if (topGrinderEl) {
        const grinderRatings = {};
        brews.forEach(brew => {
            if (brew.grinder && brew.rating) {
                if (!grinderRatings[brew.grinder]) grinderRatings[brew.grinder] = { total: 0, count: 0 };
                grinderRatings[brew.grinder].total += brew.rating;
                grinderRatings[brew.grinder].count += 1;
            }
        });
        const topGr = Object.entries(grinderRatings)
            .map(([name, data]) => ({ name, avg: data.total / data.count }))
            .sort((a, b) => b.avg - a.avg)[0];
        // Also compute counts and average grind size to show alongside
        if (topGr) {
            const count = grinderRatings[topGr.name] ? grinderRatings[topGr.name].count : 0;
            // average grind size for this grinder
            let totalGrind = 0, grindCount = 0;
            brews.forEach(brew => { if (brew.grinder === topGr.name && brew.grindSize !== undefined && brew.grindSize !== null) { totalGrind += parseFloat(brew.grindSize); grindCount++; } });
            const avgGrind = grindCount > 0 ? (totalGrind / grindCount).toFixed(1) : '-';
            topGrinderEl.textContent = `${topGr.name} (${topGr.avg.toFixed(1)}★ • ${count} brews • ${avgGrind} avg grind)`;
        } else {
            topGrinderEl.textContent = '-';
        }
    }
    // Average grind size
    if (avgGrindEl) {
        let totalGrind = 0; let grindCount = 0;
        brews.forEach(brew => {
            if (brew.grindSize !== undefined && brew.grindSize !== null) {
                totalGrind += parseFloat(brew.grindSize);
                grindCount++;
            }
        });
        const avgGr = grindCount > 0 ? totalGrind / grindCount : 0;
        avgGrindEl.textContent = grindCount > 0 ? avgGr.toFixed(1) : '-';
    }
    // Average water per brew
    if (avgWaterEl) {
        let totalWater = 0;
        let count = 0;
        brews.forEach(brew => {
            if (brew.recipe && brew.recipe.stages) {
                const sum = brew.recipe.stages.reduce((s, st) => s + (st.waterAmount || 0), 0);
                totalWater += sum; count++;
            }
        });
        const avgWater = count > 0 ? (totalWater / count) : 0;
        avgWaterEl.textContent = count > 0 ? avgWater.toFixed(0) : '-';
    }
    // Average brew time
    if (avgTimeEl) {
        let totalTime = 0;
        let timeCount = 0;
        brews.forEach(brew => {
            if (brew.recipe && brew.recipe.stages) {
                const sumTime = brew.recipe.stages.reduce((s, st) => s + (st.duration || 0), 0);
                totalTime += sumTime; timeCount++;
            }
        });
        const avgTime = timeCount > 0 ? (totalTime / timeCount) : 0;
        avgTimeEl.textContent = timeCount > 0 ? avgTime.toFixed(0) : '-';
    }
    // Trend chart (brews per day)
    const trendCtxEl = document.getElementById('trend-chart');
    if (trendCtxEl) {
        const trendCtx = trendCtxEl.getContext('2d');
        // Build per-day count for last 30 days
        const countsByDay = {};
        const days = 30;
        const today = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
            const key = d.toISOString().split('T')[0];
            countsByDay[key] = 0;
        }
        brews.forEach(brew => {
            if (brew.timestamp) {
                const key = new Date(brew.timestamp).toISOString().split('T')[0];
                if (countsByDay[key] !== undefined) countsByDay[key]++;
            }
        });
        const trendLabels = Object.keys(countsByDay);
        const trendValues = Object.values(countsByDay);
        if (window.trendChart) window.trendChart.destroy();
        const trendTotal = trendValues.reduce((a,b) => a + b, 0);
        if (trendTotal === 0) {
            trendCtx.clearRect(0, 0, trendCtx.canvas.width, trendCtx.canvas.height);
            trendCtx.font = '14px sans-serif';
            trendCtx.fillStyle = '#6b7280';
            trendCtx.textAlign = 'center';
            trendCtx.fillText('No brews in the last 30 days', trendCtx.canvas.width / 2, trendCtx.canvas.height / 2);
        } else {
        window.trendChart = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: trendLabels,
                datasets: [{
                    label: 'Brews/day',
                    data: trendValues,
                    fill: true,
                    backgroundColor: 'rgba(34,197,94,0.12)',
                    borderColor: 'rgba(34,197,94,1)',
                    tension: 0.2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Brews Over Time (last 30 days)' }
                },
                scales: {
                    x: { display: true, title: { display: false } },
                    y: { beginAtZero: true }
                }
            }
        });
        }
    }
}

function renderAnalyticsList(brews) {
    const container = document.getElementById('analytics-brews-list');
    if (!container) return;
    
    if (brews.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No brews found matching filters.</p>';
        return;
    }
    
    container.innerHTML = brews.map(brew => {
        const date = new Date(brew.timestamp).toLocaleDateString();
        const stars = '⭐'.repeat(brew.rating || 0);
        const recipeName = brew.recipe && brew.recipe.name ? brew.recipe.name : 'Default Recipe';
        
        return `
            <div class="bg-white p-4 rounded-lg shadow">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h3 class="font-semibold text-lg">${brew.beanBagId && window._beanMap && window._beanMap[brew.beanBagId] ? `${window._beanMap[brew.beanBagId].name} • ${brew.beansUsed || ''}g` : (brew.beans || 'Unknown Beans')}</h3>
                        <p class="text-sm text-gray-600">${date}</p>
                    </div>
                    <div class="text-right">
                        <div class="text-amber-500">${stars}</div>
                        <p class="text-xs text-gray-500">${brew.rating || 0}/5</p>
                    </div>
                </div>
                <div class="flex justify-end mt-2">
                    <button onclick="deleteBrew('${brew.id}')" class="text-sm text-red-600 hover:text-red-800">Delete</button>
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
                            ${brew.recipe.stages.map((stage, idx) => `
                                <div class="text-gray-600">Stage ${idx + 1}: ${stage.waterAmount}g @ ${stage.duration}s</div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function exportFilteredCsv() {
    // export the currently filtered brews
    refreshAnalytics(); // ensure latest
    setTimeout(async () => {
        try {
            const resp = await fetch('http://localhost:3000/api/brews');
            const allBrews = await resp.json();
            const filtered = filterBrews(allBrews);
            if (!filtered || filtered.length === 0) {
                alert('No brews to export');
                return;
            }
            // Build CSV header
            const headers = ['id','timestamp','beans','beanBagId','beanBagName','beansUsed','origin','roast','masl','grinder','grindSize','rating','notes','recipe_name','recipe_stages'];
            const rows = filtered.map(b => {
                // map bean bag name
                const beanBagId = b.beanBagId || '';
                let beanName = '';
                // attempt to map bean bag names via api (synchronously performed earlier)
                // We'll fetch beans here
                // (Note: this code is synchronous mapping because we fetch beans above before building rows)
                const recipeName = b.recipe && b.recipe.name ? b.recipe.name : '';
                const stages = b.recipe && b.recipe.stages ? b.recipe.stages.map(s => `${s.name}:${s.waterAmount}g@${s.duration}s`).join('|') : '';
                return [b.id, b.timestamp, b.beans || '', beanBagId, (window._beanMap && window._beanMap[beanBagId] ? window._beanMap[beanBagId].name : ''), (b.beansUsed || ''), b.origin || '', b.roast || '', b.masl || '', b.grinder || '', b.grindSize || '', b.rating || '', b.notes || '', recipeName, stages];
            });
            const csv = [headers.join(',')].concat(rows.map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(','))).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pourover-brews-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error exporting CSV', err);
            alert('Failed to export CSV');
        }
    }, 500);
}

function generateInsights(brews) {
    const container = document.getElementById('insights-container');
    if (!container || brews.length === 0) return;
    
    const insights = [];
    
    // Find highest rated beans
    const beanRatings = {};
    brews.forEach(brew => {
        if (brew.beans && brew.rating) {
            if (!beanRatings[brew.beans]) {
                beanRatings[brew.beans] = { total: 0, count: 0 };
            }
            beanRatings[brew.beans].total += brew.rating;
            beanRatings[brew.beans].count += 1;
        }
    });
    
    const topBeans = Object.entries(beanRatings)
        .map(([beans, data]) => ({ beans, avg: data.total / data.count }))
        .sort((a, b) => b.avg - a.avg)[0];
    
    if (topBeans) {
        insights.push(`Your highest rated beans are <strong>${topBeans.beans}</strong> with an average rating of ${topBeans.avg.toFixed(1)} stars.`);
    }
    
    // Find most common origin
    const origins = {};
    brews.forEach(brew => {
        if (brew.origin) {
            origins[brew.origin] = (origins[brew.origin] || 0) + 1;
        }
    });
    const topOrigin = Object.entries(origins).sort((a, b) => b[1] - a[1])[0];
    if (topOrigin) {
        insights.push(`You've brewed coffee from <strong>${topOrigin[0]}</strong> ${topOrigin[1]} time${topOrigin[1] > 1 ? 's' : ''}.`);
    }
    
    // Recipe insights
    const recipeRatings = {};
    brews.forEach(brew => {
        if (brew.recipe && brew.recipe.name && brew.rating) {
            if (!recipeRatings[brew.recipe.name]) {
                recipeRatings[brew.recipe.name] = { total: 0, count: 0 };
            }
            recipeRatings[brew.recipe.name].total += brew.rating;
            recipeRatings[brew.recipe.name].count += 1;
        }
    });
    
    const topRecipe = Object.entries(recipeRatings)
        .map(([name, data]) => ({ name, avg: data.total / data.count }))
        .sort((a, b) => b.avg - a.avg)[0];
    
    if (topRecipe) {
        insights.push(`Your best performing recipe is <strong>${topRecipe.name}</strong> with an average rating of ${topRecipe.avg.toFixed(1)} stars.`);
    }
    // Grinder insights: most used grinder and best grinder by average rating
    const grinderCounts = {};
    const grinderRatings = {};
    brews.forEach(brew => {
        if (brew.grinder) {
            grinderCounts[brew.grinder] = (grinderCounts[brew.grinder] || 0) + 1;
            if (brew.rating !== undefined && brew.rating !== null) {
                if (!grinderRatings[brew.grinder]) grinderRatings[brew.grinder] = { total: 0, count: 0 };
                grinderRatings[brew.grinder].total += brew.rating;
                grinderRatings[brew.grinder].count++;
            }
        }
    });
    const topUsedGrinder = Object.entries(grinderCounts).sort((a, b) => b[1] - a[1])[0];
    if (topUsedGrinder) {
        const name = topUsedGrinder[0]; const count = topUsedGrinder[1];
        insights.push(`Most used grinder: <strong>${name}</strong> — ${count} brew${count > 1 ? 's' : ''}.`);
    }
    const topRatedGrinder = Object.entries(grinderRatings).map(([name, data]) => ({ name, avg: data.total / data.count })).sort((a,b) => b.avg - a.avg)[0];
    if (topRatedGrinder) {
        insights.push(`Highest-rated grinder: <strong>${topRatedGrinder.name}</strong> with an average rating of ${topRatedGrinder.avg.toFixed(1)} stars.`);
    }
    
    container.innerHTML = insights.map(insight => `
        <p class="mb-2">• ${insight}</p>
    `).join('');
}
