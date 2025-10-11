const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ensure the .env file is loaded from the correct path
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Chrysorrhoe Database File Path
const dbPath = path.join(__dirname, '..', 'data', 'wallet.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('SQLite connection error:', err.message);
  } else {
    console.log('Connected to SQLite database');
    // Enable foreign key constraints
    db.run('PRAGMA foreign_keys = ON');
  }
});

// Chrysorrhoe Database Operations Promise Wrapper
const dbAsync = {
  // Execute query and return all results
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Execute query and return the first result
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // Execute insert/update/delete operation
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  // Begin transaction
  beginTransaction: () => {
    return dbAsync.run('BEGIN TRANSACTION');
  },

  // Commit transaction
  commit: () => {
    return dbAsync.run('COMMIT');
  },

  // Rollback transaction
  rollback: () => {
    return dbAsync.run('ROLLBACK');
  }
};

// Graceful close database connection
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database connection:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});

module.exports = { db, dbAsync };