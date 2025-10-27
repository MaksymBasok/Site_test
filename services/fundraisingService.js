const db = require('../db');

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

function getTotals() {
  const donation = db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM donations').get();
  const withdrawal = db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM withdrawals').get();
  return {
    totalRaised: donation.total,
    totalWithdrawn: withdrawal.total,
    balance: donation.total - withdrawal.total
  };
}

function listBankAccounts() {
  return db.prepare(`
    SELECT id, label, recipient, iban, edrpou, purpose,
           datetime(updated_at) as updated_at
    FROM bank_accounts
    ORDER BY id ASC
  `).all();
}

module.exports = {
  getActiveGoal,
  getTotals,
  listBankAccounts
};
