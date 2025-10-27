const bcrypt = require('bcrypt');
const createError = require('http-errors');
const db = require('../db');

const SALT_ROUNDS = 12;

function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

async function ensureAdminAccount() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL та ADMIN_PASSWORD повинні бути вказані в змінних середовища');
  }

  const existing = findUserByEmail(email);
  if (existing) {
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const stmt = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)');
  const info = stmt.run(email, passwordHash, 'admin');
  return { id: info.lastInsertRowid, email, role: 'admin' };
}

async function authenticate(email, password) {
  const user = findUserByEmail(email);
  if (!user) {
    throw createError(401, 'Невірний логін або пароль');
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw createError(401, 'Невірний логін або пароль');
  }

  return { id: user.id, email: user.email, role: user.role };
}

module.exports = { ensureAdminAccount, authenticate };
