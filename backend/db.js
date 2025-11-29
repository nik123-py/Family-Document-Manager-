// backend/db.js
// SQLite DB initialization and helpers
// All data is stored **locally** in data/family_data.sqlite

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, 'family_data.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err);
  } else {
    console.log('Connected to SQLite database at', dbPath);
  }
});

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS family_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      relationship TEXT,
      dob TEXT,
      notes TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_member_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      number TEXT,
      issue_date TEXT,
      expiry_date TEXT,
      authority TEXT,
      file_ref TEXT,
      notes TEXT,
      FOREIGN KEY(family_member_id) REFERENCES family_members(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_member_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      institution TEXT,
      branch TEXT,
      account_number TEXT,
      nickname TEXT,
      holder_type TEXT,
      joint_holders TEXT,
      ifsc TEXT,
      open_date TEXT,
      maturity_date TEXT,
      value REAL,
      nominee TEXT,
      notes TEXT,
      FOREIGN KEY(family_member_id) REFERENCES family_members(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS insurances_loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_member_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      company TEXT,
      policy_loan_number TEXT,
      product_name TEXT,
      amount REAL,
      premium_emi REAL,
      frequency TEXT,
      start_date TEXT,
      end_date TEXT,
      nominee TEXT,
      linked_asset TEXT,
      status TEXT,
      notes TEXT,
      FOREIGN KEY(family_member_id) REFERENCES family_members(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lockers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_member_id INTEGER NOT NULL,
      bank_name TEXT,
      branch TEXT,
      locker_number TEXT,
      joint_holders TEXT,
      nominee TEXT,
      notes TEXT,
      FOREIGN KEY(family_member_id) REFERENCES family_members(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_member_id INTEGER NOT NULL,
      title TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      property_type TEXT,
      linked_docs TEXT,
      ownership_type TEXT,
      co_owners TEXT,
      notes TEXT,
      FOREIGN KEY(family_member_id) REFERENCES family_members(id) ON DELETE CASCADE
    )
  `);
});

// Small Promise helpers
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

module.exports = {
  db,
  run,
  get,
  all
};
