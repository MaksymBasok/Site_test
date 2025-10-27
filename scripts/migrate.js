const fs = require('fs');
const path = require('path');
const db = require('../db');

const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');

function run() {
  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  db.exec('PRAGMA foreign_keys = OFF;');
  try {
    files.forEach((file) => {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`Applying migration ${file}`);
      db.exec(sql);
    });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed', error);
    process.exitCode = 1;
  } finally {
    db.exec('PRAGMA foreign_keys = ON;');
  }
}

run();
