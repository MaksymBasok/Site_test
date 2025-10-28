const { body, validationResult } = require('express-validator');
const createError = require('http-errors');
const db = require('../db');

const donationValidators = [
  body('donor_name').trim().isLength({ min: 2 }).withMessage('Вкажіть ім\'я (мінімум 2 символи)').escape(),
  body('amount').isInt({ min: 10, max: 10000000 }).withMessage('Сума має бути від 10 до 10 000 000 грн.'),
  body('message').optional({ checkFalsy: true }).trim().isLength({ max: 300 }).withMessage('Повідомлення занадто довге.').escape(),
  body('public').optional().toBoolean()
];

function createDonation(data) {
  const stmt = db.prepare(`
    INSERT INTO donations (donor_name, amount, currency, message, public)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    data.donor_name,
    data.amount,
    data.currency || 'UAH',
    data.message || null,
    data.public ? 1 : 0
  );
  return info.lastInsertRowid;
}

function listPublicDonations(limit = 10) {
  return db.prepare(`
    SELECT donor_name, amount, currency, message,
           datetime(created_at) AS created_at
    FROM donations
    WHERE public = 1
    ORDER BY datetime(created_at) DESC
    LIMIT ?
  `).all(limit);
}

function listRecent(limit = 20) {
  return db.prepare(`
    SELECT id, donor_name, amount, currency, public,
           datetime(created_at) AS created_at
    FROM donations
    ORDER BY datetime(created_at) DESC
    LIMIT ?
  `).all(limit);
}

function listAll() {
  return db.prepare(`
    SELECT id, donor_name, amount, currency, message, public,
           datetime(created_at) AS created_at
    FROM donations
    ORDER BY datetime(created_at) DESC
  `).all();
}

function validate(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array();
    const error = createError(422, details[0].msg);
    error.fields = details.map((item) => ({ field: item.path, message: item.msg }));
    throw error;
  }
}

module.exports = {
  donationValidators,
  createDonation,
  listPublicDonations,
  listRecent,
  listAll,
  validate
};
