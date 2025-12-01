import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { checkPwnedPasswordCount } from './pwned';
import { sanitizeForLog } from './log-utils';

// Load local .env for secrets (development/test only) — this is safe to ignore in git
dotenv.config();
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'brews.json');
const RECIPES_FILE = path.join(DATA_DIR, 'recipes.json');
const GRINDERS_FILE = path.join(DATA_DIR, 'grinders.json');
const BEANS_FILE = path.join(DATA_DIR, 'beans.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

app.use(cors());
app.use(express.json());

// Debug: log all incoming requests (method + path) BEFORE static so we can see the incoming calls


app.use((req: Request, res: Response, next: any) => {
  const body = req.body ? sanitizeForLog(req.body) : undefined;
  console.log('Incoming request:', req.method, req.path, body ? { body } : '');
  next();
});

app.use(express.static(path.join(__dirname, '../public')));

// JWT secret configuration: require a set secret in production; otherwise generate a secure ephemeral secret.
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '12', 10);

let JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: JWT_SECRET is required in production; set JWT_SECRET environment variable and restart.');
    process.exit(1);
  }
  // Generate an ephemeral secret for development/testing runs
  JWT_SECRET = crypto.randomBytes(64).toString('hex');
  console.info('Info: JWT_SECRET not provided — using an ephemeral secret for development/test only. Do not use this in production.');
}

// If a JWT_SECRET is present but shorter than recommended, warn in dev and reject in production
if (JWT_SECRET && JWT_SECRET.length < 32) {
  const msg = 'JWT_SECRET is shorter than recommended (32 chars). Use a longer random secret.';
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR:', msg);
    process.exit(1);
  } else {
    console.warn('Warning:', msg);
  }
}

interface User {
  id: string;
  username: string;
  email?: string;
  passwordHash: string;
}

function ensureUsersFile() {
  ensureDataFile(USERS_FILE);
}

function readUsers(): User[] {
  ensureUsersFile();
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    return [];
  }
}

function writeUsers(users: User[]) {
  ensureUsersFile();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function generateTokenForUser(user: User) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

// Promisified bcrypt helpers for async hashing/compare
function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, SALT_ROUNDS, (err: any, hash: string | undefined) => {
      if (err) return reject(err);
      resolve(hash as string);
    });
  });
}

function comparePassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, hash, (err: any, ok: boolean | undefined) => {
      if (err) return reject(err);
      resolve(!!ok);
    });
  });
}

// We now import checkPwnedPasswordCount from ./pwned, which is unit-testable and avoids
// inlined network logic inside server.ts. This also ensures we never transmit raw passwords.

function authenticate(req: Request, res: Response, next: any) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: 'Missing Authorization header' });
  const parts = h.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid Authorization header format' });
  const token = parts[1];
  try {
    const secret = JWT_SECRET;
    const payload = jwt.verify(token, secret) as any;
    (req as any).user = { id: payload.id, username: payload.username };
    next();
  } catch (err) {
    console.warn('Invalid token for request', req.method, req.path, {ip: req.ip});
    return res.status(401).json({ error: 'Invalid token' });
  }
}

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
app.get('/api/brews', authenticate, (req: Request, res: Response) => {
  try {
    ensureDataFile(DATA_FILE);
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    const brews: Brew[] = JSON.parse(data);
    // Only return brews owned by the user
    const userId = (req as any).user.id;
    res.json(brews.filter(b => (b as any).userId === userId));
  } catch (error) {
    res.status(500).json({ error: 'Failed to read brews' });
  }
});

// User registration
app.post('/api/users/register', async (req: Request, res: Response) => {
  try {
    // Avoid logging sensitive fields like password
    console.log('POST /api/users/register', { username: req.body && req.body.username });
    // Optionally check if the password exists in known breaches and warn in logs
    const pwnCount = await checkPwnedPasswordCount(req.body && req.body.password);
    if (pwnCount > 0) {
      console.warn('Password for user', req.body && req.body.username, 'was found in', pwnCount, 'breaches');
    }
    const { username, email, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const users = readUsers();
    if (users.find(u => u.username === username)) return res.status(400).json({ error: 'Username already exists' });
    const id = Date.now().toString();
    const passwordHash = await hashPassword(password);
    const newUser: User = { id, username, email, passwordHash };
    users.push(newUser);
    writeUsers(users);
    const token = generateTokenForUser(newUser);
    const respBody: any = { id, username, email, token };
    if (pwnCount > 0) {
      respBody.warning = `Password found in ${pwnCount} data breaches; consider changing your password`;
    }
    res.status(201).json(respBody);
  } catch (err) {
    console.error('Error in /api/users/register', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// User login
app.post('/api/users/login', async (req: Request, res: Response) => {
  try {
    console.log('POST /api/users/login', { username: req.body && req.body.username });
    const pwnCount = await checkPwnedPasswordCount(req.body && req.body.password);
    if (pwnCount > 0) {
      console.warn('Password for login user', req.body && req.body.username, 'was found in', pwnCount, 'breaches');
    }
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const users = readUsers();
    const user = users.find(u => u.username === username);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!(await comparePassword(password, user.passwordHash))) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateTokenForUser(user);
    const respBody: any = { token, id: user.id, username: user.username };
    if (pwnCount > 0) {
      respBody.warning = `Password found in ${pwnCount} data breaches; consider changing your password`;
    }
    res.json(respBody);
  } catch (err) {
    console.error('Error in /api/users/login', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user
app.get('/api/users/me', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, username: user.username, email: user.email });
});

// Ping API to verify connectivity
app.get('/api/ping', (req: Request, res: Response) => {
  res.json({ ok: true });
});

// Dev-only debug endpoint to inspect auth header and validate token
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug/auth', (req: Request, res: Response) => {
    const h = req.headers.authorization;
    if (!h) return res.json({ ok: true, auth: false, reason: 'No Authorization header' });
    const parts = h.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.json({ ok: true, auth: false, reason: 'Bad formatting' });
    const token = parts[1];
    try {
      const payload: any = jwt.verify(token, JWT_SECRET) as any;
      return res.json({ ok: true, auth: true, payload: { id: payload.id, username: payload.username } });
    } catch (err) {
      return res.json({ ok: true, auth: false, reason: 'Invalid token' });
    }
  });
}

// NOTE: API catch-all moved to the end of file to avoid shadowing routes defined later

// Save a new brew
app.post('/api/brews', authenticate, (req: Request, res: Response) => {
  console.log('POST /api/brews', sanitizeForLog(req.body));
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

    const newBrew: Brew & { userId?: string } = {
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
    // associate user
    newBrew.userId = (req as any).user.id;

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
app.delete('/api/brews/:id', authenticate, (req: Request, res: Response) => {
  try {
    ensureDataFile(DATA_FILE);
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    let brews: Brew[] = JSON.parse(data);
    const brewId = req.params.id;
    const userId = (req as any).user.id;
    // Only delete if the brew belongs to the user
    const brew = brews.find(b => b.id === brewId);
    if (!brew) return res.status(404).json({ error: 'Brew not found' });
    if ((brew as any).userId !== userId) return res.status(403).json({ error: 'Forbidden' });
    brews = brews.filter(brew => brew.id !== brewId);
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(brews, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete brew' });
  }
});

// Get all recipes
app.get('/api/recipes', authenticate, (req: Request, res: Response) => {
  try {
    ensureDataFile(RECIPES_FILE);
    const data = fs.readFileSync(RECIPES_FILE, 'utf-8');
    const recipes: (Recipe & { userId?: string })[] = JSON.parse(data);
    const userId = (req as any).user.id;
    res.json(recipes.filter(r => (r as any).userId === userId));
  } catch (error) {
    res.status(500).json({ error: 'Failed to read recipes' });
  }
});

// Grinders endpoints
app.get('/api/grinders', authenticate, (req: Request, res: Response) => {
  try {
    ensureDataFile(GRINDERS_FILE);
    const data = fs.readFileSync(GRINDERS_FILE, 'utf-8');
      const grinders: (Grinder & { userId?: string })[] = JSON.parse(data);
    const userId = (req as any).user.id;
    res.json(grinders.filter(g => (g as any).userId === userId));
  } catch (error) {
    res.status(500).json({ error: 'Failed to read grinders' });
  }
});

// Beans endpoints
app.get('/api/beans', authenticate, (req: Request, res: Response) => {
  try {
    ensureDataFile(BEANS_FILE);
    const data = fs.readFileSync(BEANS_FILE, 'utf-8');
    const beans: BeanBag[] & { userId?: string }[] = JSON.parse(data);
    const userId = (req as any).user.id;
    res.json(beans.filter(b => (b as any).userId === userId));
  } catch (error) {
    res.status(500).json({ error: 'Failed to read beans' });
  }
});

app.post('/api/beans', authenticate, (req: Request, res: Response) => {
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
    const newBean: BeanBag & { userId?: string } = {
      id: Date.now().toString(),
      name: req.body.name,
      bagSize: bagSize,
      remaining: bagSize
    };
    newBean.userId = (req as any).user.id;
    beans.push(newBean);
    fs.writeFileSync(BEANS_FILE, JSON.stringify(beans, null, 2));
    res.status(201).json(newBean);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save bean bag' });
  }
});

app.put('/api/beans/:id', authenticate, (req: Request, res: Response) => {
  try {
    ensureDataFile(BEANS_FILE);
    const data = fs.readFileSync(BEANS_FILE, 'utf-8');
    const beans: BeanBag[] = JSON.parse(data);
    const { id } = req.params;
    const { name, bagSize, remaining, origin, roast, masl } = req.body;
    const idx = beans.findIndex(b => b.id === id);
    if (idx === -1) return res.status(404).json({error: 'Bean bag not found'});
    if ((beans[idx] as any).userId !== (req as any).user.id) return res.status(403).json({ error: 'Forbidden' });
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

app.delete('/api/beans/:id', authenticate, (req: Request, res: Response) => {
  try {
    ensureDataFile(BEANS_FILE);
    const data = fs.readFileSync(BEANS_FILE, 'utf-8');
    let beans: BeanBag[] = JSON.parse(data);
    const id = req.params.id;
    const origLen = beans.length;
    beans = beans.filter(b => b.id !== id);
    // Ensure we only removed user's beans
    if (origLen === beans.length) return res.status(404).json({ error: 'Bean bag not found' });
    if (beans.length === origLen) return res.status(404).json({ error: 'Bean bag not found' });
    fs.writeFileSync(BEANS_FILE, JSON.stringify(beans, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bean bag' });
  }
});

app.post('/api/grinders', authenticate, (req: Request, res: Response) => {
  try {
    ensureDataFile(GRINDERS_FILE);
    const data = fs.readFileSync(GRINDERS_FILE, 'utf-8');
    const grinders: Grinder[] = JSON.parse(data);
    const { name, notes } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Invalid grinder name' });
    }
    const newGrinder: Grinder & { userId?: string } = {
      id: Date.now().toString(),
      name: name.trim(),
      notes: notes || ''
    };
    newGrinder.userId = (req as any).user.id;
    grinders.push(newGrinder);
    fs.writeFileSync(GRINDERS_FILE, JSON.stringify(grinders, null, 2));
    res.status(201).json(newGrinder);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save grinder' });
  }
});

app.delete('/api/grinders/:id', authenticate, (req: Request, res: Response) => {
  try {
    ensureDataFile(GRINDERS_FILE);
    const data = fs.readFileSync(GRINDERS_FILE, 'utf-8');
    let grinders: (Grinder & { userId?: string })[] = JSON.parse(data);
    const id = req.params.id;
    const idx = grinders.findIndex(g => g.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Grinder not found' });
    if ((grinders[idx] as any).userId !== (req as any).user.id) return res.status(403).json({ error: 'Forbidden' });
    grinders = grinders.filter(g => g.id !== id);
    fs.writeFileSync(GRINDERS_FILE, JSON.stringify(grinders, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete grinder' });
  }
});

// Update an existing grinder
app.put('/api/grinders/:id', authenticate, (req: Request, res: Response) => {
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
    if ((grinders[idx] as any).userId !== (req as any).user.id) return res.status(403).json({ error: 'Forbidden' });
    grinders[idx].name = name;
    grinders[idx].notes = notes || '';
    fs.writeFileSync(GRINDERS_FILE, JSON.stringify(grinders, null, 2));
    res.json(grinders[idx]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update grinder' });
  }
});

// Save a new recipe
app.post('/api/recipes', authenticate, (req: Request, res: Response) => {
  try {
    console.log('POST /api/recipes', sanitizeForLog(req.body));
    ensureDataFile(RECIPES_FILE);
    const data = fs.readFileSync(RECIPES_FILE, 'utf-8');
    const recipes: Recipe[] = JSON.parse(data);
    
    const newRecipe: Recipe & { userId?: string } = {
      id: Date.now().toString(),
      name: req.body.name || 'Custom Recipe',
      stages: req.body.stages || []
      , baseBeans: req.body.baseBeans !== undefined ? parseFloat(req.body.baseBeans) : undefined
    };
    newRecipe.userId = (req as any).user.id;
    
    recipes.push(newRecipe);
    fs.writeFileSync(RECIPES_FILE, JSON.stringify(recipes, null, 2));
    console.log(`Saved new recipe id=${newRecipe.id} name=${newRecipe.name}`);
    res.status(201).json(newRecipe);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save recipe' });
  }
});

// Update an existing recipe
app.put('/api/recipes/:id', authenticate, (req: Request, res: Response) => {
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
    if ((recipes[idx] as any).userId !== (req as any).user.id) return res.status(403).json({ error: 'Forbidden' });
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
app.delete('/api/recipes/:id', authenticate, (req: Request, res: Response) => {
  try {
    ensureDataFile(RECIPES_FILE);
    const data = fs.readFileSync(RECIPES_FILE, 'utf-8');
    let recipes: Recipe[] = JSON.parse(data);
        const id = req.params.id;
        const userId = (req as any).user.id;
        console.log(`DELETE /api/recipes/${id} requested`);
        const idx = recipes.findIndex(r => r.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Recipe not found' });
        if ((recipes[idx] as any).userId !== userId) return res.status(403).json({ error: 'Forbidden' });
        recipes.splice(idx, 1);
    fs.writeFileSync(RECIPES_FILE, JSON.stringify(recipes, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

// Only listen if this file is run directly, not when imported for tests
// Catch-all for unknown API routes, return JSON (avoid HTML error pages for API calls)
app.use('/api', (req: Request, res: Response) => {
  console.warn('Unhandled API request:', req.method, req.path);
  res.status(404).json({ error: `Not Found: ${req.method} ${req.path}` });
});
if (require && require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Pourover timer server running at http://localhost:${PORT}`);
  });
  server.on('error', (err: any) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Kill the other process or change PORT environment variable.`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

export default app;
