const { body, validationResult } = require('express-validator');
const createError = require('http-errors');
const db = require('../db');

const volunteerValidators = [
  body('full_name').trim().isLength({ min: 3 }).withMessage('Вкажіть ПІБ (мінімум 3 символи)').escape(),
  body('phone').trim().matches(/^\+?\d{10,15}$/).withMessage('Вкажіть коректний номер телефону').escape(),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Некоректний email').normalizeEmail(),
  body('region').optional({ checkFalsy: true }).trim().escape(),
  body('skills').optional({ checkFalsy: true }).trim().isLength({ max: 200 }).withMessage('Опишіть навички коротше.').escape(),
  body('comment').optional({ checkFalsy: true }).trim().isLength({ max: 500 }).withMessage('Коментар занадто довгий.').escape()
];

function createVolunteer(data) {
  const stmt = db.prepare(`
    INSERT INTO volunteers (full_name, email, phone, region, skills, comment)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    data.full_name,
    data.email || null,
    data.phone,
    data.region || null,
    data.skills || null,
    data.comment || null
  );
  return info.lastInsertRowid;
}

function validate(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError(422, errors.array()[0].msg);
  }
}

function listRecent(limit = 20) {
  return db.prepare(`
    SELECT full_name, phone, email, region, skills, comment,
           datetime(created_at) AS created_at
    FROM volunteers
    ORDER BY datetime(created_at) DESC
    LIMIT ?
  `).all(limit);
}

module.exports = {
  volunteerValidators,
  createVolunteer,
  validate,
  listRecent
};
