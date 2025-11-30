import express, { Request, Response } from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
const PORT = 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'brews.json');
const RECIPES_FILE = path.join(DATA_DIR, 'recipes.json');
const GRINDERS_FILE = path.join(DATA_DIR, 'grinders.json');
const BEANS_FILE = path.join(DATA_DIR, 'beans.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

interface Brew {
  id: string;
  timestamp: string;
  beans: string;
  rating: number;
  // Detailed brew information
  origin?: string;
  roast?: string;
  masl?: string;
  recipe?: {
    name: string;
    stages: {
      name: string;
      duration: number;
      waterAmount: number;
    }[];
  };
  notes?: string;
  grinder?: string;
  grindSize?: number;
  beanBagId?: string;
  beansUsed?: number; // grams used in the brew
}

interface Recipe {
  id: string;
  name: string;
  stages: {
    name: string;
    duration: number;
    waterAmount: number;
  }[];
  baseBeans?: number;
}

interface Grinder {
  id: string;
  name: string;
  notes?: string;
}

interface BeanBag {
  id: string;
  name: string;
  bagSize: number; // grams
  remaining: number; // grams
  origin?: string;
  roast?: string;
  masl?: string;
}

// Ensure data directory and file exist
function ensureDataFile(filePath: string): void {
  const dataDir = path.dirname(filePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
  }
}

// Get all brews
app.get('/api/brews', (req: Request, res: Response) => {
  try {
    ensureDataFile(DATA_FILE);
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    const brews: Brew[] = JSON.parse(data);
    res.json(brews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read brews' });
  }
});

// Save a new brew
app.post('/api/brews', (req: Request, res: Response) => {
  console.log('POST /api/brews payload:', JSON.stringify(req.body));
  try {
    ensureDataFile(DATA_FILE);
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    const brews: Brew[] = JSON.parse(data);

    // Validate rating
    const rating = req.body.rating || 0;
    if (typeof rating !== 'number' && typeof rating !== 'string') {
      return res.status(400).json({ error: 'Invalid rating' });
    }
    const parsedRating = parseInt(rating as any);
    if (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5) {
      return res.status(400).json({ error: 'Rating must be between 0 and 5' });
    }

    // Validate grindSize if provided
    const grindSize = req.body.grindSize !== undefined ? parseFloat(req.body.grindSize) : undefined;
    if (grindSize !== undefined && (isNaN(grindSize) || grindSize < 0 || grindSize > 5000)) {
      return res.status(400).json({ error: 'Invalid grindSize: must be a number between 0 and 5000' });
    }

    // Validate beansUsed if provided
    const beansUsed = req.body.beansUsed !== undefined ? parseFloat(req.body.beansUsed) : undefined;
    if (beansUsed !== undefined && (isNaN(beansUsed) || beansUsed < 0)) {
      return res.status(400).json({ error: 'Invalid beansUsed value' });
    }

    const newBrew: Brew = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      beans: req.body.beans || 'Unknown',
      rating: parsedRating,
      origin: req.body.origin,
      roast: req.body.roast,
      masl: req.body.masl,
      grinder: req.body.grinder,
      grindSize: grindSize,
      beanBagId: req.body.beanBagId || undefined,
      beansUsed: beansUsed,
      recipe: req.body.recipe,
      notes: req.body.notes
    };

    brews.push(newBrew);
    fs.writeFileSync(DATA_FILE, JSON.stringify(brews, null, 2));

    // If bean bag id provided and beansUsed is a number, decrement inventory
    try {
      if (newBrew.beanBagId && newBrew.beansUsed !== undefined && !isNaN(newBrew.beansUsed)) {
        ensureDataFile(BEANS_FILE);
        const bdata = fs.readFileSync(BEANS_FILE, 'utf-8');
        const beans: BeanBag[] = JSON.parse(bdata);
        const idx = beans.findIndex(b => b.id === newBrew.beanBagId);
        if (idx !== -1) {
          beans[idx].remaining = Math.max(0, (beans[idx].remaining || beans[idx].bagSize) - newBrew.beansUsed);
          // update bean metadata if provided in the brew
          if (newBrew.origin !== undefined) beans[idx].origin = newBrew.origin || beans[idx].origin || '';
          if (newBrew.roast !== undefined) beans[idx].roast = newBrew.roast || beans[idx].roast || '';
          if (newBrew.masl !== undefined) beans[idx].masl = newBrew.masl || beans[idx].masl || '';
          fs.writeFileSync(BEANS_FILE, JSON.stringify(beans, null, 2));
        }
      }
    } catch (err) {
      console.warn('Failed to update bean inventory after brew save', err);
    }

    res.status(201).json(newBrew);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save brew' });
  }
});

// Delete a brew
app.delete('/api/brews/:id', (req: Request, res: Response) => {
  try {
    ensureDataFile(DATA_FILE);
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    let brews: Brew[] = JSON.parse(data);
    
    const brewId = req.params.id;
    brews = brews.filter(brew => brew.id !== brewId);
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(brews, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete brew' });
  }
});

// Get all recipes
app.get('/api/recipes', (req: Request, res: Response) => {
  try {
    ensureDataFile(RECIPES_FILE);
    const data = fs.readFileSync(RECIPES_FILE, 'utf-8');
    const recipes: Recipe[] = JSON.parse(data);
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read recipes' });
  }
});

// Grinders endpoints
app.get('/api/grinders', (req: Request, res: Response) => {
  try {
    ensureDataFile(GRINDERS_FILE);
    const data = fs.readFileSync(GRINDERS_FILE, 'utf-8');
    const grinders: Grinder[] = JSON.parse(data);
    res.json(grinders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read grinders' });
  }
});

// Beans endpoints
app.get('/api/beans', (req: Request, res: Response) => {
  try {
    ensureDataFile(BEANS_FILE);
    const data = fs.readFileSync(BEANS_FILE, 'utf-8');
    const beans: BeanBag[] = JSON.parse(data);
    res.json(beans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read beans' });
  }
});

app.post('/api/beans', (req: Request, res: Response) => {
  try {
    ensureDataFile(BEANS_FILE);
    const data = fs.readFileSync(BEANS_FILE, 'utf-8');
    const beans: BeanBag[] = JSON.parse(data);
    const bagSize = req.body.bagSize !== undefined ? parseFloat(req.body.bagSize) : 0;
    if (!req.body.name || typeof req.body.name !== 'string') {
      return res.status(400).json({ error: 'Invalid bean name' });
    }
    if (isNaN(bagSize) || bagSize <= 0) {
      return res.status(400).json({ error: 'Invalid bagSize (must be number > 0)' });
    }
    const newBean: BeanBag = {
      id: Date.now().toString(),
      name: req.body.name,
      bagSize: bagSize,
      remaining: bagSize
    };
    beans.push(newBean);
    fs.writeFileSync(BEANS_FILE, JSON.stringify(beans, null, 2));
    res.status(201).json(newBean);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save bean bag' });
  }
});

app.put('/api/beans/:id', (req: Request, res: Response) => {
  try {
    ensureDataFile(BEANS_FILE);
    const data = fs.readFileSync(BEANS_FILE, 'utf-8');
    const beans: BeanBag[] = JSON.parse(data);
    const { id } = req.params;
    const { name, bagSize, remaining, origin, roast, masl } = req.body;
    const idx = beans.findIndex(b => b.id === id);
    if (idx === -1) return res.status(404).json({error: 'Bean bag not found'});
    if (name && typeof name === 'string') beans[idx].name = name;
    if (bagSize !== undefined) {
      const bs = parseFloat(bagSize);
      if (isNaN(bs) || bs <= 0) return res.status(400).json({error: 'Invalid bagSize'});
      beans[idx].bagSize = bs;
      if (beans[idx].remaining > bs) beans[idx].remaining = bs;
    }
    if (remaining !== undefined) {
      const rem = parseFloat(remaining);
      if (isNaN(rem) || rem < 0) return res.status(400).json({error: 'Invalid remaining value'});
      beans[idx].remaining = rem;
    }
    if (origin !== undefined) beans[idx].origin = origin || '';
    if (roast !== undefined) beans[idx].roast = roast || '';
    if (masl !== undefined) beans[idx].masl = masl || '';
    fs.writeFileSync(BEANS_FILE, JSON.stringify(beans, null, 2));
    res.json(beans[idx]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update bean bag' });
  }
});

app.delete('/api/beans/:id', (req: Request, res: Response) => {
  try {
    ensureDataFile(BEANS_FILE);
    const data = fs.readFileSync(BEANS_FILE, 'utf-8');
    let beans: BeanBag[] = JSON.parse(data);
    const id = req.params.id;
    const origLen = beans.length;
    beans = beans.filter(b => b.id !== id);
    if (beans.length === origLen) return res.status(404).json({ error: 'Bean bag not found' });
    fs.writeFileSync(BEANS_FILE, JSON.stringify(beans, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bean bag' });
  }
});

app.post('/api/grinders', (req: Request, res: Response) => {
  try {
    ensureDataFile(GRINDERS_FILE);
    const data = fs.readFileSync(GRINDERS_FILE, 'utf-8');
    const grinders: Grinder[] = JSON.parse(data);
    const { name, notes } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Invalid grinder name' });
    }
    const newGrinder: Grinder = {
      id: Date.now().toString(),
      name: name.trim(),
      notes: notes || ''
    };
    grinders.push(newGrinder);
    fs.writeFileSync(GRINDERS_FILE, JSON.stringify(grinders, null, 2));
    res.status(201).json(newGrinder);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save grinder' });
  }
});

app.delete('/api/grinders/:id', (req: Request, res: Response) => {
  try {
    ensureDataFile(GRINDERS_FILE);
    const data = fs.readFileSync(GRINDERS_FILE, 'utf-8');
    let grinders: Grinder[] = JSON.parse(data);
    const id = req.params.id;
    grinders = grinders.filter(g => g.id !== id);
    fs.writeFileSync(GRINDERS_FILE, JSON.stringify(grinders, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete grinder' });
  }
});

// Update an existing grinder
app.put('/api/grinders/:id', (req: Request, res: Response) => {
  try {
    ensureDataFile(GRINDERS_FILE);
    const data = fs.readFileSync(GRINDERS_FILE, 'utf-8');
    const grinders: Grinder[] = JSON.parse(data);
    const { id } = req.params;
    const { name, notes } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Invalid grinder name' });
    }
    const idx = grinders.findIndex(g => g.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Grinder not found' });
    }
    grinders[idx].name = name;
    grinders[idx].notes = notes || '';
    fs.writeFileSync(GRINDERS_FILE, JSON.stringify(grinders, null, 2));
    res.json(grinders[idx]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update grinder' });
  }
});

// Save a new recipe
app.post('/api/recipes', (req: Request, res: Response) => {
  try {
    console.log('POST /api/recipes payload:', JSON.stringify(req.body));
    ensureDataFile(RECIPES_FILE);
    const data = fs.readFileSync(RECIPES_FILE, 'utf-8');
    const recipes: Recipe[] = JSON.parse(data);
    
    const newRecipe: Recipe = {
      id: Date.now().toString(),
      name: req.body.name || 'Custom Recipe',
      stages: req.body.stages || []
      , baseBeans: req.body.baseBeans !== undefined ? parseFloat(req.body.baseBeans) : undefined
    };
    
    recipes.push(newRecipe);
    fs.writeFileSync(RECIPES_FILE, JSON.stringify(recipes, null, 2));
    console.log(`Saved new recipe id=${newRecipe.id} name=${newRecipe.name}`);
    res.status(201).json(newRecipe);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save recipe' });
  }
});

// Update an existing recipe
app.put('/api/recipes/:id', (req: Request, res: Response) => {
  try {
    ensureDataFile(RECIPES_FILE);
    const data = fs.readFileSync(RECIPES_FILE, 'utf-8');
    const recipes: Recipe[] = JSON.parse(data);
    const { id } = req.params;
    const { name, stages } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Invalid recipe name' });
    }
    const idx = recipes.findIndex(r => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    recipes[idx].name = name;
    recipes[idx].stages = stages || [];
    if (req.body.baseBeans !== undefined) recipes[idx].baseBeans = parseFloat(req.body.baseBeans);
    fs.writeFileSync(RECIPES_FILE, JSON.stringify(recipes, null, 2));
    console.log(`Updated recipe id=${recipes[idx].id} name=${recipes[idx].name}`);
    res.json(recipes[idx]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

// Delete a recipe by ID
app.delete('/api/recipes/:id', (req: Request, res: Response) => {
  try {
    ensureDataFile(RECIPES_FILE);
    const data = fs.readFileSync(RECIPES_FILE, 'utf-8');
    let recipes: Recipe[] = JSON.parse(data);
        const id = req.params.id;
        console.log(`DELETE /api/recipes/${id} requested`);
        const origLen = recipes.length;
        recipes = recipes.filter(r => r.id !== id);
        if (recipes.length === origLen) {
          return res.status(404).json({ error: 'Recipe not found' });
        }
    fs.writeFileSync(RECIPES_FILE, JSON.stringify(recipes, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

// Only listen if this file is run directly, not when imported for tests
if (require && require.main === module) {
  app.listen(PORT, () => {
    console.log(`Pourover timer server running at http://localhost:${PORT}`);
  });
}

export default app;
