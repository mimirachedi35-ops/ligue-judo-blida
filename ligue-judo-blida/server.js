const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'omar1208';
const SESSION_SECRET = process.env.SESSION_SECRET || 'ligue-judo-blida-secret-key-2026';

app.use(express.json({ limit: '5mb' }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 } // 30 jours
}));

// ---------- MongoDB ----------
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connecté'))
  .catch(err => console.error('Erreur MongoDB:', err));

const CATEGORIES = ['akabir', 'awasit', 'achbal', 'asghar', 'baraem', 'katakit'];

const StateSchema = new mongoose.Schema({
  _id: { type: String, default: 'main' },
  currentSeason: { type: String, default: '2026/2027' },
  settings: {
    prices: {
      akabir: { type: Number, default: 0 },
      awasit: { type: Number, default: 0 },
      achbal: { type: Number, default: 0 },
      asghar: { type: Number, default: 0 },
      baraem: { type: Number, default: 0 },
      katakit: { type: Number, default: 0 }
    },
    coachPrice: { type: Number, default: 0 },
    refereePrice: { type: Number, default: 0 }
  },
  clubs: { type: Array, default: [] },
  archives: { type: Array, default: [] }
}, { minimize: false, strict: false });

const State = mongoose.model('State', StateSchema);

async function getOrCreateState() {
  let state = await State.findById('main');
  if (!state) {
    state = new State({ _id: 'main' });
    await state.save();
  }
  return state;
}

// ---------- Auth ----------
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  return res.status(401).json({ error: 'Non authentifié' });
}

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, error: 'Code d\'accès incorrect' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/check-auth', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.authenticated) });
});

// ---------- State API ----------
app.get('/api/state', requireAuth, async (req, res) => {
  try {
    const state = await getOrCreateState();
    res.json(state);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/state', requireAuth, async (req, res) => {
  try {
    const { currentSeason, settings, clubs, archives } = req.body;
    const state = await getOrCreateState();
    if (currentSeason !== undefined) state.currentSeason = currentSeason;
    if (settings !== undefined) state.settings = settings;
    if (clubs !== undefined) state.clubs = clubs;
    if (archives !== undefined) state.archives = archives;
    await state.save();
    res.json({ success: true, state });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Renouvellement de saison : archive la saison en cours et repart avec une liste vide
app.post('/api/new-season', requireAuth, async (req, res) => {
  try {
    const { newSeasonLabel } = req.body;
    const state = await getOrCreateState();
    state.archives.push({
      season: state.currentSeason,
      settings: state.settings,
      clubs: state.clubs,
      archivedAt: new Date()
    });
    state.currentSeason = newSeasonLabel || 'Nouvelle saison';
    state.clubs = [];
    // on garde les tarifs (settings.prices) car ils changent rarement d'une saison à l'autre,
    // l'utilisatrice peut les modifier depuis Réglages
    await state.save();
    res.json({ success: true, state });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
