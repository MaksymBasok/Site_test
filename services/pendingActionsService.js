const createError = require('http-errors');
const db = require('../db');
const donationService = require('./donationService');
const volunteerService = require('./volunteerService');

function mapAction(row) {
  if (!row) return null;
  let payload = {};
  try {
    payload = row.payload ? JSON.parse(row.payload) : {};
  } catch (error) {
    payload = row.payload;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    action: row.action,
    status: row.status,
    payload,
    source: row.source,
    processed_entity_id: row.processed_entity_id,
    resolution_notes: row.resolution_notes,
    created_at: row.created_at,
    processed_at: row.processed_at,
    processed_by: row.processed_by,
    submitted_by_name: row.submitted_by_name,
    submitted_by_email: row.submitted_by_email,
    processed_by_name: row.processed_by_name,
    processed_by_email: row.processed_by_email
  };
}

function queueAction({ userId = null, entityType, action, payload = {}, source = null }) {
  const stmt = db.prepare(
    `INSERT INTO pending_actions (user_id, entity_type, action, payload, source)
     VALUES (?, ?, ?, ?, ?)`
  );
  const info = stmt.run(userId, entityType, action, JSON.stringify(payload), source);
  return info.lastInsertRowid;
}

function listAll() {
  return db
    .prepare(
      `SELECT pa.*, datetime(pa.created_at) AS created_at, datetime(pa.processed_at) AS processed_at,
              submitter.full_name AS submitted_by_name, submitter.email AS submitted_by_email,
              processor.full_name AS processed_by_name, processor.email AS processed_by_email
       FROM pending_actions pa
       LEFT JOIN users submitter ON submitter.id = pa.user_id
       LEFT JOIN users processor ON processor.id = pa.processed_by
       ORDER BY datetime(pa.created_at) DESC`
    )
    .all()
    .map(mapAction);
}

function listFiltered({ entityType = 'all', status = 'pending', page = 1, pageSize = 10 } = {}) {
  const filters = [];
  const params = [];

  if (entityType && entityType !== 'all') {
    filters.push('pa.entity_type = ?');
    params.push(entityType);
  }

  if (status && status !== 'all') {
    filters.push('pa.status = ?');
    params.push(status);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const limit = Math.max(Number(pageSize) || 10, 1);
  const offset = Math.max(Number(page) - 1, 0) * limit;

  const total = db
    .prepare(`SELECT COUNT(*) as total FROM pending_actions pa ${whereClause}`)
    .get(...params).total;

  const items = db
    .prepare(
      `SELECT pa.*, datetime(pa.created_at) AS created_at, datetime(pa.processed_at) AS processed_at,
              submitter.full_name AS submitted_by_name, submitter.email AS submitted_by_email,
              processor.full_name AS processed_by_name, processor.email AS processed_by_email
       FROM pending_actions pa
       LEFT JOIN users submitter ON submitter.id = pa.user_id
       LEFT JOIN users processor ON processor.id = pa.processed_by
       ${whereClause}
       ORDER BY datetime(pa.created_at) DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset)
    .map(mapAction);

  return {
    items,
    total,
    page: Number(page) || 1,
    pageSize: limit,
    totalPages: Math.max(Math.ceil(total / limit), 1)
  };
}

function summarize() {
  const stats = db.prepare(`
    SELECT entity_type, status, COUNT(*) as count
    FROM pending_actions
    GROUP BY entity_type, status
  `).all();

  return stats.reduce(
    (acc, row) => {
      acc.statuses[row.status] = (acc.statuses[row.status] || 0) + row.count;
      const typeKey = row.entity_type || 'unknown';
      if (!acc.byType[typeKey]) {
        acc.byType[typeKey] = { pending: 0, approved: 0, rejected: 0, total: 0 };
      }
      acc.byType[typeKey][row.status] = (acc.byType[typeKey][row.status] || 0) + row.count;
      acc.byType[typeKey].total += row.count;
      acc.statuses.total += row.count;
      return acc;
    },
    { statuses: { total: 0 }, byType: {} }
  );
}

function findById(id) {
  const row = db
    .prepare(
      `SELECT pa.*, datetime(pa.created_at) AS created_at, datetime(pa.processed_at) AS processed_at,
              submitter.full_name AS submitted_by_name, submitter.email AS submitted_by_email,
              processor.full_name AS processed_by_name, processor.email AS processed_by_email
       FROM pending_actions pa
       LEFT JOIN users submitter ON submitter.id = pa.user_id
       LEFT JOIN users processor ON processor.id = pa.processed_by
       WHERE pa.id = ?`
    )
    .get(id);
  return mapAction(row);
}

function applyAction(action) {
  switch (action.entity_type) {
    case 'donation':
      return donationService.createDonation({
        donor_name: action.payload.donor_name,
        amount: Number(action.payload.amount),
        currency: action.payload.currency || 'UAH',
        message: action.payload.message,
        public: false
      });
    case 'volunteer':
      return volunteerService.createVolunteer(action.payload);
    default:
      throw createError(400, 'Невідомий тип заявки для виконання.');
  }
}

function rollbackAction(action) {
  if (!action.processed_entity_id) return;

  switch (action.entity_type) {
    case 'donation':
      donationService.deleteDonation(action.processed_entity_id);
      break;
    case 'volunteer':
      volunteerService.deleteVolunteer(action.processed_entity_id);
      break;
    default:
      break;
  }
}

function approveAction(id, processedBy) {
  const action = findById(id);
  if (!action) {
    throw createError(404, 'Заявку не знайдено');
  }
  if (action.status === 'approved') {
    throw createError(400, 'Заявку вже підтверджено.');
  }

  let entityId = action.processed_entity_id;
  if (!entityId) {
    entityId = applyAction(action);
  }

  db.prepare(
    `UPDATE pending_actions
     SET status = 'approved', processed_at = CURRENT_TIMESTAMP, processed_by = ?, processed_entity_id = ?, resolution_notes = NULL
     WHERE id = ?`
  ).run(processedBy || null, entityId || null, id);

  return entityId;
}

function rejectAction(id, processedBy, notes = null) {
  const action = findById(id);
  if (!action) {
    throw createError(404, 'Заявку не знайдено');
  }

  db.prepare(
    `UPDATE pending_actions
     SET status = 'rejected', processed_at = CURRENT_TIMESTAMP, processed_by = ?, resolution_notes = ?
     WHERE id = ?`
  ).run(processedBy || null, notes || null, id);
}

function revertAction(id) {
  const action = findById(id);
  if (!action) {
    throw createError(404, 'Заявку не знайдено');
  }
  if (action.status === 'pending') {
    return;
  }

  if (action.status === 'approved' && action.processed_entity_id) {
    rollbackAction(action);
  }

  db.prepare(
    `UPDATE pending_actions
     SET status = 'pending', processed_at = NULL, processed_by = NULL, processed_entity_id = NULL, resolution_notes = NULL
     WHERE id = ?`
  ).run(id);
}

module.exports = {
  queueAction,
  listAll,
  listFiltered,
  summarize,
  findById,
  approveAction,
  rejectAction,
  revertAction
};
