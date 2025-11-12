
const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// File paths
const DATA_DIR = path.join(__dirname, 'data');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');

// Ensure data dir and files exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(BOOKINGS_FILE)) fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([]));
if (!fs.existsSync(CONTACTS_FILE)) fs.writeFileSync(CONTACTS_FILE, JSON.stringify([]));

// Helpers for file read/write
function readJSON(file) {
  try {
    const raw = fs.readFileSync(file);
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({ secret: process.env.SESSION_SECRET || 'tellusmove_secret', resave: false, saveUninitialized: true }));

// Routes
app.get('/', (req, res) => res.render('index'));
app.get('/book', (req, res) => res.render('book'));

app.post('/book', (req, res) => {
  const { name, phone, email, pickup, dropoff, date, truckType } = req.body;
  const bookings = readJSON(BOOKINGS_FILE);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  const booking = { id, name, phone, email, pickup, dropoff, date, truckType, status: 'pending', createdAt: new Date().toISOString() };
  bookings.push(booking);
  writeJSON(BOOKINGS_FILE, bookings);
  res.render('book', { success: true, bookingId: booking.id });
});

app.get('/track', (req, res) => res.render('track'));
app.post('/track', (req, res) => {
  const { bookingId } = req.body;
  const bookings = readJSON(BOOKINGS_FILE);
  const found = bookings.find(b => b.id === bookingId);
  res.render('track', { result: found });
});

app.get('/schedules', (req, res) => {
  const bookings = readJSON(BOOKINGS_FILE).filter(b => b.status !== 'deleted');
  res.render('schedules', { bookings });
});

app.get('/alerts', (req, res) => res.render('alerts'));
app.get('/about', (req, res) => res.render('about'));

app.get('/contact', (req, res) => res.render('contact'));
app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;
  const contacts = readJSON(CONTACTS_FILE);
  contacts.push({ id: Date.now().toString(36), name, email, message, createdAt: new Date().toISOString() });
  writeJSON(CONTACTS_FILE, contacts);
  res.render('contact', { success: true });
});

app.get('/coming-soon', (req, res) => res.render('coming-soon'));

// Admin routes
app.get('/admin', (req, res) => res.render('admin-login'));
app.post('/admin', (req, res) => {
  const { username, password } = req.body;
  if (username === 'gaurav' && password === 'gaurav') {
    req.session.isAdmin = true;
    return res.redirect('/admin/dashboard');
  }
  res.render('admin-login', { error: 'Invalid credentials' });
});

app.get('/admin/dashboard', (req, res) => {
  if (!req.session.isAdmin) return res.redirect('/admin');
  const bookings = readJSON(BOOKINGS_FILE);
  res.render('admin-dashboard', { bookings });
});

app.post('/admin/delete/:id', (req, res) => {
  if (!req.session.isAdmin) return res.redirect('/admin');
  const bookings = readJSON(BOOKINGS_FILE);
  const filtered = bookings.filter(b => b.id !== req.params.id);
  writeJSON(BOOKINGS_FILE, filtered);
  res.redirect('/admin/dashboard');
});

app.post('/admin/mark/:id', (req, res) => {
  if (!req.session.isAdmin) return res.redirect('/admin');
  const bookings = readJSON(BOOKINGS_FILE);
  const idx = bookings.findIndex(b => b.id === req.params.id);
  if (idx !== -1) {
    bookings[idx].status = 'confirmed';
    writeJSON(BOOKINGS_FILE, bookings);
  }
  res.redirect('/admin/dashboard');
});

app.get('/admin-logout', (req, res) => { req.session.destroy(() => res.redirect('/')); });

// Start server
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
