const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'nenifix-secret-key-2024',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      users: [],
      materials: {}
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

passport.use(new LocalStrategy(
  { usernameField: 'email' },
  (email, password, done) => {
    const data = loadData();
    const user = data.users.find(u => u.email === email);
    if (!user) {
      return done(null, false, { message: 'User not found' });
    }
    if (!bcrypt.compareSync(password, user.password)) {
      return done(null, false, { message: 'Incorrect password' });
    }
    return done(null, user);
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const data = loadData();
  const user = data.users.find(u => u.id === id);
  done(null, user);
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, error: 'Unauthorized' });
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/auth/signup', (req, res) => {
  const { email, password } = req.body;
  const data = loadData();
  
  if (data.users.find(u => u.email === email)) {
    return res.json({ success: false, error: 'Email already exists' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    id: Date.now().toString(),
    email,
    password: hashedPassword
  };
  data.users.push(newUser);

  if (!data.materials[newUser.id]) {
    data.materials[newUser.id] = {
      'sticker': { name: 'Sticker', rate: 2.5 },
      'flexy': { name: 'Flexy', rate: 3.0 }
    };
  }

  saveData(data);
  res.json({ success: true });
});

app.post('/auth/login', passport.authenticate('local'), (req, res) => {
  res.json({ success: true, user: { email: req.user.email } });
});

app.post('/auth/logout', (req, res) => {
  req.logout(() => {
    res.json({ success: true });
  });
});

app.get('/auth/user', (req, res) => {
  if (req.user) {
    res.json({ success: true, user: { email: req.user.email } });
  } else {
    res.json({ success: false, error: 'Not logged in' });
  }
});

app.get('/api/materials', ensureAuthenticated, (req, res) => {
  const data = loadData();
  res.json({ success: true, materials: data.materials[req.user.id] || {} });
});

app.post('/api/materials', ensureAuthenticated, (req, res) => {
  const { materialId, name, rate } = req.body;
  const data = loadData();
  if (!data.materials[req.user.id]) {
    data.materials[req.user.id] = {};
  }
  data.materials[req.user.id][materialId] = { name, rate: parseFloat(rate) };
  saveData(data);
  res.json({ success: true, materials: data.materials[req.user.id] });
});

app.delete('/api/materials/:materialId', ensureAuthenticated, (req, res) => {
  const data = loadData();
  if (data.materials[req.user.id]) {
    delete data.materials[req.user.id][req.params.materialId];
    saveData(data);
  }
  res.json({ success: true, materials: data.materials[req.user.id] || {} });
});

app.post('/api/calculate', (req, res) => {
  const { height, length, material } = req.body;
  const data = loadData();
  
  const heightNum = parseFloat(height);
  const lengthNum = parseFloat(length);

  if (isNaN(heightNum) || isNaN(lengthNum) || heightNum <= 0 || lengthNum <= 0) {
    return res.json({ success: false, error: 'Please enter valid positive numbers for both dimensions.' });
  }

  let materials = {};
  if (req.user && data.materials[req.user.id]) {
    materials = data.materials[req.user.id];
  } else {
    materials = {
      'sticker': { name: 'Sticker', rate: 2.5 },
      'flexy': { name: 'Flexy', rate: 3.0 }
    };
  }

  if (!materials[material]) {
    return res.json({ success: false, error: 'Please select a valid material type.' });
  }

  const grandTotal = (lengthNum * heightNum) * materials[material].rate;
  const roundedTotal = Math.round(grandTotal * 100) / 100;

  res.json({ success: true, total: roundedTotal });
});

app.listen(PORT, () => {
  console.log(`Asafo Print POS (Passport) running at http://localhost:${PORT}`);
});
