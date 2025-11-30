# Debugging Guide

## Fixed Issues

### Problem 1: TypeScript syntax in JavaScript file
The original `timer.js` file contained TypeScript syntax (interfaces, type annotations) which browsers cannot parse.

**Solution**: Converted all TypeScript syntax to plain JavaScript:
- Removed interface declarations
- Removed type annotations (`: void`, `: number`, etc.)
- Removed type assertions (`as HTMLInputElement`)

### Problem 2: Event listeners not attaching
The main issue was the TypeScript syntax preventing the JavaScript from executing at all.

## How to Debug

### 1. Open Browser Console
1. Open http://localhost:3000 in your browser
2. Press F12 or right-click → Inspect
3. Go to the Console tab

### 2. Expected Console Logs

When the page loads, you should see:
```
Timer.js loaded successfully
Audio context created: [AudioContext object]
Setting up event listeners...
DOM Content Loaded
Elements found: {startBtn: true, resetBtn: true, saveBrewBtn: true, ratingBtns: 5}
Adding click listener to start button
Event listeners setup complete
Loading brews...
Loaded brews: []
```

### 3. When You Click Start

You should see:
```
Start button clicked!
startTimer called - isRunning: false
Timer started!
Total duration: 180
Initial time set to: 45
Updating display - Time remaining: 45 Stage: 0
Updating stage indicators for stage: 0
Interval started: [number]
```

Then every second:
```
Tick - Time remaining: 44
Updating display - Time remaining: 44 Stage: 0
Updating stage indicators for stage: 0
```

### 4. When Stage Completes

You should see:
```
Moving to next stage from: 0
New stage index: 1
Playing beep sound
Beep played successfully
```

## Common Issues

### Issue: No console logs at all
- Check that the server is running: `curl http://localhost:3000`
- Verify `timer.js` loads: Check Network tab in DevTools

### Issue: "Start button not found!"
- HTML elements might not have the correct IDs
- Check that `index.html` has `id="start-btn"`

### Issue: Timer doesn't increment
- Check for JavaScript errors in console
- Verify `setInterval` is being called (should see "Interval started: [number]")

### Issue: No sound
- Audio context might need user interaction first
- Try clicking the page before starting
- Check browser audio permissions

## Testing the API

### Get all brews:
```bash
curl http://localhost:3000/api/brews
```

### Save a brew:
```bash
curl -X POST http://localhost:3000/api/brews \
  -H "Content-Type: application/json" \
  -d '{"beans": "Ethiopian Yirgacheffe", "rating": 5}'
```

## Server Logs

The server is running with logs saved to `server.log`. View them with:
```bash
tail -f server.log
```

## Restart Everything

If things aren't working:

1. Stop the server:
```bash
pkill -f "node dist/server.js"
```

2. Rebuild:
```bash
npm run build
```

3. Start server:
```bash
npm start
```

4. Open browser to http://localhost:3000
5. Open DevTools console (F12)
6. Refresh page
7. Check for console logs

## File Structure
```
coffee/
├── public/
│   ├── index.html       ← Main page
│   └── timer.js         ← Frontend logic (PURE JAVASCRIPT)
├── src/
│   └── server.ts        ← Backend (TypeScript, gets compiled)
├── dist/
│   └── server.js        ← Compiled backend
└── data/
    └── brews.json       ← Saved brews (auto-created)
```

Note: Only files in `src/` should have TypeScript. Files in `public/` must be pure JavaScript!
