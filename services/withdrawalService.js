const { body, validationResult } = require('express-validator');
const createError = require('http-errors');
const db = require('../db');

const withdrawalValidators = [
  body('amount').isInt({ min: 1, max: 10000000 }).withMessage('Сума має бути додатною.'),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 300 }).withMessage('Опис занадто довгий.').escape()
];

function createWithdrawal(data, userId) {
  const stmt = db.prepare(`
    INSERT INTO withdrawals (amount, description, created_by)
    VALUES (?, ?, ?)
  `);
  const info = stmt.run(data.amount, data.description || null, userId || null);
  return info.lastInsertRowid;
}

function listRecent(limit = 20) {
  return db.prepare(`
    SELECT amount, description, datetime(created_at) AS created_at
    FROM withdrawals
    ORDER BY datetime(created_at) DESC
    LIMIT ?
  `).all(limit);
}

function listAll() {
  return db.prepare(`
    SELECT id, amount, description, created_by,
           datetime(created_at) AS created_at
    FROM withdrawals
    ORDER BY datetime(created_at) DESC
  `).all();
}

function validate(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError(422, errors.array()[0].msg);
  }
}

module.exports = {
  withdrawalValidators,
  createWithdrawal,
  listRecent,
  listAll,
  validate
};
