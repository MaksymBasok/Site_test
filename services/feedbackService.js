const { body, validationResult } = require('express-validator');
const createError = require('http-errors');
const db = require('../db');

const feedbackValidators = [
  body('sender_name').trim().isLength({ min: 3 }).withMessage('Вкажіть ім\'я або організацію').escape(),
  body('contact').optional({ checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('Контакт занадто довгий').escape(),
  body('message').trim().isLength({ min: 10, max: 800 }).withMessage('Повідомлення має містити від 10 до 800 символів').escape(),
  body('channel').optional({ checkFalsy: true }).trim().isLength({ max: 50 }).escape()
];

const FEEDBACK_STATUSES = ['new', 'in_progress', 'resolved', 'archived'];

function mapFeedback(row) {
  if (!row) return null;
  return {
    ...row,
    created_at: row.created_at,
    handled_at: row.handled_at,
    status: row.status || 'new'
  };
}

function listRecent(limit = 10) {
  return db
    .prepare(`
      SELECT sender_name, contact, message, channel, status, datetime(created_at) AS created_at
      FROM volunteer_feedback
      ORDER BY datetime(created_at) DESC
      LIMIT ?
    `)
    .all(limit)
    .map(mapFeedback);
}

function listAll() {
  return db
    .prepare(`
      SELECT id, sender_name, contact, message, channel, status, resolution_notes,
             handled_by, datetime(created_at) AS created_at, datetime(handled_at) AS handled_at
      FROM volunteer_feedback
      ORDER BY datetime(created_at) DESC
    `)
    .all()
    .map(mapFeedback);
}

function createFeedback(data) {
  const stmt = db.prepare(`
    INSERT INTO volunteer_feedback (sender_name, contact, message, channel, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(data.sender_name, data.contact || null, data.message, data.channel || null, 'new');
  return info.lastInsertRowid;
}

function updateStatus(id, status, handledBy = null, notes = null) {
  if (!FEEDBACK_STATUSES.includes(status)) {
    throw createError(422, 'Некоректний статус звернення');
  }

  const existing = findById(id);
  if (!existing) {
    throw createError(404, 'Звернення не знайдено');
  }

  db.prepare(
    `UPDATE volunteer_feedback
     SET status = ?, handled_by = ?, handled_at = CURRENT_TIMESTAMP, resolution_notes = ?
     WHERE id = ?`
  ).run(status, handledBy || null, notes || null, id);
}

function listPaginated({ status = 'all', page = 1, pageSize = 10 } = {}) {
  const filters = [];
  const params = [];

  if (status && status !== 'all') {
    filters.push('status = ?');
    params.push(status);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const limit = Math.max(Number(pageSize) || 10, 1);
  const offset = Math.max(Number(page) - 1, 0) * limit;

  const total = db.prepare(`SELECT COUNT(*) as total FROM volunteer_feedback ${whereClause}`).get(...params).total;

  const items = db
    .prepare(
      `SELECT id, sender_name, contact, message, channel, status, resolution_notes,
              handled_by, datetime(created_at) AS created_at, datetime(handled_at) AS handled_at
       FROM volunteer_feedback
       ${whereClause}
       ORDER BY datetime(created_at) DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset)
    .map(mapFeedback);

  return {
    items,
    total,
    page: Number(page) || 1,
    pageSize: limit,
    totalPages: Math.max(Math.ceil(total / limit), 1)
  };
}

function findById(id) {
  const row = db
    .prepare(
      `SELECT id, sender_name, contact, message, channel, status, resolution_notes,
              handled_by, datetime(created_at) AS created_at, datetime(handled_at) AS handled_at
       FROM volunteer_feedback
       WHERE id = ?`
    )
    .get(id);
  return mapFeedback(row);
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
  FEEDBACK_STATUSES,
  feedbackValidators,
  listRecent,
  listAll,
  listPaginated,
  findById,
  createFeedback,
  updateStatus,
  validate
};
