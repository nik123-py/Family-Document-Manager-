// backend/server.js
// Local-only Express backend, serving API + static frontend
// IMPORTANT: binds ONLY to 127.0.0.1 (localhost).

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const authRoutes = require('./routes/auth');
const familyRoutes = require('./routes/family');
const importExportRoutes = require('./routes/importExport');

const app = express();

// ---- Middleware ----
app.use(bodyParser.json({ limit: '2mb' }));
app.use(cookieParser());

// Session stored locally in SQLite (data/sessions.sqlite)
app.use(
  session({
    name: 'fdm.sid',
    secret: 'change_this_to_something_random_and_local_only',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    },
    store: new SQLiteStore({
      db: 'sessions.sqlite',
      dir: path.join(__dirname, '../data')
    })
  })
);

// No CORS needed since frontend is served from same origin.
// No external network calls are made anywhere in this backend.

// ---- API routes ----
app.use('/api/auth', authRoutes);
app.use('/api', familyRoutes);
app.use('/api', importExportRoutes);

// ---- Static frontend ----
const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// ---- Start server (LOCALHOST ONLY) ----

const PORT = 3000;

app.listen(PORT, '127.0.0.1', () => {
  console.log(
    `Family Document Manager backend running at http://127.0.0.1:${PORT} (localhost only)`
  );
});
