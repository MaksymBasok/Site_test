const { body, validationResult } = require('express-validator');
const createError = require('http-errors');
const db = require('../db');

const bankAccountValidators = [
  body('label').trim().isLength({ min: 3 }).withMessage('Назва закоротка').escape(),
  body('recipient').trim().isLength({ min: 3 }).withMessage('Вкажіть отримувача').escape(),
  body('iban').trim().isLength({ min: 10, max: 40 }).withMessage('Некоректний IBAN').escape(),
  body('edrpou').optional({ checkFalsy: true }).trim().isLength({ max: 12 }).escape(),
  body('purpose').optional({ checkFalsy: true }).trim().isLength({ max: 300 }).escape()
];

function getActiveGoal() {
  return db.prepare(`
    SELECT id, title, description, target_amount, status,
           datetime(updated_at) as updated_at
    FROM fundraising_goals
    WHERE status = 'active'
    ORDER BY updated_at DESC
    LIMIT 1
  `).get();
}

function listGoals() {
  return db.prepare(`
    SELECT id, title, description, target_amount, status,
           datetime(updated_at) as updated_at
    FROM fundraising_goals
    ORDER BY datetime(updated_at) DESC
  `).all();
}

function getTotals() {
  const donation = db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM donations').get();
  const withdrawal = db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM withdrawals').get();
  return {
    totalRaised: donation.total,
    totalWithdrawn: withdrawal.total,
    balance: donation.total - withdrawal.total
  };
}

function listWithdrawals(limit = 20) {
  return db.prepare(`
    SELECT amount, description, datetime(created_at) AS created_at
    FROM withdrawals
    ORDER BY datetime(created_at) DESC
    LIMIT ?
  `).all(limit);
}

function listBankAccounts() {
  return db.prepare(`
    SELECT id, label, recipient, iban, edrpou, purpose,
           datetime(updated_at) as updated_at
    FROM bank_accounts
    ORDER BY id ASC
  `).all();
}

function createBankAccount(data) {
  const stmt = db.prepare(`
    INSERT INTO bank_accounts (label, recipient, iban, edrpou, purpose)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(data.label, data.recipient, data.iban, data.edrpou || null, data.purpose || null);
  return info.lastInsertRowid;
}

function updateBankAccount(id, data) {
  db.prepare(`
    UPDATE bank_accounts
    SET label = ?,
        recipient = ?,
        iban = ?,
        edrpou = ?,
        purpose = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(data.label, data.recipient, data.iban, data.edrpou || null, data.purpose || null, id);
}

function deleteBankAccount(id) {
  db.prepare('DELETE FROM bank_accounts WHERE id = ?').run(id);
}

function setActiveGoal(goalId) {
  db.prepare(`
    UPDATE fundraising_goals
    SET status = CASE
      WHEN id = ? THEN 'active'
      WHEN status = 'active' THEN 'archived'
      ELSE status
    END
  `).run(goalId);
}

function createGoal(data) {
  const stmt = db.prepare(`
    INSERT INTO fundraising_goals (title, description, target_amount, status)
    VALUES (?, ?, ?, ?)
  `);
  const info = stmt.run(data.title, data.description || null, data.target_amount, data.status || 'draft');
  return info.lastInsertRowid;
}

function updateGoal(id, data) {
  db.prepare(`
    UPDATE fundraising_goals
    SET title = ?,
        description = ?,
        target_amount = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(data.title, data.description || null, data.target_amount, data.status, id);
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
  bankAccountValidators,
  getActiveGoal,
  listGoals,
  getTotals,
  listWithdrawals,
  listBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  createGoal,
  updateGoal,
  setActiveGoal,
  validate
};
