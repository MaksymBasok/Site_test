const fs = require('fs');
const path = require('path');
const db = require('../db');

const seedsDir = path.join(__dirname, '..', 'db', 'seeds');

function run() {
  const files = fs.readdirSync(seedsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  try {
    files.forEach((file) => {
      const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
      console.log(`Applying seed ${file}`);
      db.exec(sql);
    });
    console.log('Seed data inserted successfully');
  } catch (error) {
    console.error('Seeding failed', error);
    process.exitCode = 1;
  }
}

run();
