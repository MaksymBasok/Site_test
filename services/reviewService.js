const { body, validationResult } = require('express-validator');
const createError = require('http-errors');
const db = require('../db');

const reviewValidators = [
  body('author_name').trim().isLength({ min: 2 }).withMessage('Вкажіть ім\'я').escape(),
  body('rating').optional({ checkFalsy: true }).isInt({ min: 1, max: 5 }).withMessage('Оцініть від 1 до 5'),
  body('message').trim().isLength({ min: 10, max: 600 }).withMessage('Відгук повинен містити від 10 до 600 символів').escape()
];

function listPublic(limit = 10) {
  return db.prepare(`
    SELECT id, author_name, rating, message, datetime(created_at) AS created_at
    FROM donor_reviews
    WHERE public = 1
    ORDER BY datetime(created_at) DESC
    LIMIT ?
  `).all(limit);
}

function listAll() {
  return db.prepare(`
    SELECT id, author_name, rating, message, public, datetime(created_at) AS created_at
    FROM donor_reviews
    ORDER BY datetime(created_at) DESC
  `).all();
}

function createReview(data) {
  const stmt = db.prepare(`
    INSERT INTO donor_reviews (user_id, author_name, rating, message, public)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(data.user_id || null, data.author_name, data.rating || null, data.message, data.public ? 1 : 0);
  return info.lastInsertRowid;
}

function toggleVisibility(id, visible) {
  db.prepare('UPDATE donor_reviews SET public = ? WHERE id = ?').run(visible ? 1 : 0, id);
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
  reviewValidators,
  listPublic,
  listAll,
  createReview,
  toggleVisibility,
  validate
};
