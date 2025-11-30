# Analytics Features - Pour Over Coffee Timer

## Overview
Enhanced brew logging and analytics dashboard for deeper insights into your coffee brewing habits.

## New Features Implemented

### 1. Enhanced Brew Logging
When completing a brew, you can now track:
- **Origin**: Coffee bean origin (dropdown with 12+ options)
  - Ethiopia, Colombia, Brazil, Kenya, Guatemala, Costa Rica, Panama, Honduras, Peru, Rwanda, Burundi, Yemen
- **Roast Level**: Light, Medium, Medium-Dark, Dark
- **MASL**: Altitude in meters above sea level
  - 800-1200m, 1200-1600m, 1600-2000m, 2000m+
- **Notes**: Free-form tasting notes and observations
- **Recipe**: Automatically captured from current timer configuration

### 2. Analytics Dashboard
Access via the "Analytics" tab to view:

#### Statistics Cards
- **Total Brews**: Count of all logged brews
- **Average Rating**: Mean rating across all brews
- **Favorite Origin**: Most frequently brewed origin
- **Favorite Roast**: Most frequently used roast level

#### Filtering System
Filter your brew history by:
- Origin
- Roast level
- Rating (1-5 stars)

#### Detailed Brew List
Each brew shows:
- Bean name and date
- Star rating
- Origin, roast level, and MASL
- Recipe name used
- Recipe details (all 4 stages with water amounts and timings)
- Personal notes

#### AI Insights
Automatically generated insights including:
- Highest rated beans
- Most common origin preference
- Best performing recipe based on ratings
- Brewing frequency patterns

## How to Use

### Recording a Detailed Brew
1. Complete a timer cycle
2. Fill out the completion form:
   - Bean name (required)
   - Rating (1-5 stars, required)
   - Origin (dropdown)
   - Roast level (dropdown)
   - MASL range (dropdown)
   - Personal notes (text area)
3. Click "Save Brew"
4. Recipe is automatically saved with the brew

### Viewing Analytics
1. Click the "Analytics" tab
2. Use filters to narrow down brews
3. View statistics at the top
4. Scroll through detailed brew list
5. Read AI-generated insights

### Recipe Tracking
- Each brew automatically saves the recipe used (4-stage configuration)
- Recipe details are displayed in brew cards
- Compare different recipes to see which performs best

## Technical Details

### Data Structure
```javascript
{
  id: string,
  timestamp: Date,
  beans: string,
  rating: number (1-5),
  origin?: string,
  roast?: string,
  masl?: string,
  notes?: string,
  recipe?: {
    name: string,
    stages: [
      { name: string, duration: number, waterAmount: number }
    ]
  }
}
```

### API Endpoints
- `GET /api/brews` - Fetch all brews
- `POST /api/brews` - Save new brew with enhanced data
- `DELETE /api/brews/:id` - Delete a brew

### Storage
All data is persisted to `/data/brews.json` on the server.

## Future Enhancements
Potential additions:
- Export brew history to CSV
- Brew comparison tool
- Temperature tracking
- Water quality logging
- Grind size correlation
- Time-series charts
- Recipe recommendations based on preferences
