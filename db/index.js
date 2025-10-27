const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbDir = __dirname;
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const databaseFile = path.join(dbDir, 'volonterka.sqlite');
const db = new Database(databaseFile);

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

module.exports = db;
