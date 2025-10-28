const { body, validationResult } = require('express-validator');
const createError = require('http-errors');
const db = require('../db');

const feedbackValidators = [
  body('sender_name').trim().isLength({ min: 3 }).withMessage('Вкажіть ім\'я або організацію').escape(),
  body('contact').optional({ checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('Контакт занадто довгий').escape(),
  body('message').trim().isLength({ min: 10, max: 800 }).withMessage('Повідомлення має містити від 10 до 800 символів').escape(),
  body('channel').optional({ checkFalsy: true }).trim().isLength({ max: 50 }).escape()
];

function listRecent(limit = 10) {
  return db.prepare(`
    SELECT sender_name, contact, message, channel, datetime(created_at) AS created_at
    FROM volunteer_feedback
    ORDER BY datetime(created_at) DESC
    LIMIT ?
  `).all(limit);
}

function listAll() {
  return db.prepare(`
    SELECT id, sender_name, contact, message, channel,
           datetime(created_at) AS created_at
    FROM volunteer_feedback
    ORDER BY datetime(created_at) DESC
  `).all();
}

function createFeedback(data) {
  const stmt = db.prepare(`
    INSERT INTO volunteer_feedback (sender_name, contact, message, channel)
    VALUES (?, ?, ?, ?)
  `);
  const info = stmt.run(data.sender_name, data.contact || null, data.message, data.channel || null);
  return info.lastInsertRowid;
}

function validate(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError(422, errors.array()[0].msg);
  }
}

module.exports = {
  feedbackValidators,
  listRecent,
  listAll,
  createFeedback,
  validate
};
