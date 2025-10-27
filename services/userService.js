const bcrypt = require('bcrypt');
const createError = require('http-errors');
const db = require('../db');

const SALT_ROUNDS = 12;

const STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  BANNED: 'banned'
};

function mapUser(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    full_name: row.full_name,
    phone: row.phone,
    status: row.status,
    proof_path: row.proof_path,
    notes: row.notes,
    approved_at: row.approved_at,
    banned_at: row.banned_at,
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function findUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

async function ensureAdminAccount() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL та ADMIN_PASSWORD повинні бути вказані в змінних середовища');
  }

  const existing = findUserByEmail(email);
  if (existing) {
    if (existing.status !== STATUSES.APPROVED || existing.role !== 'admin') {
      db.prepare('UPDATE users SET role = ?, status = ?, approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP) WHERE id = ?')
        .run('admin', STATUSES.APPROVED, existing.id);
    }
    return mapUser(existing);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const stmt = db.prepare(`
    INSERT INTO users (email, password_hash, role, status, approved_at, full_name)
    VALUES (?, ?, 'admin', ?, CURRENT_TIMESTAMP, ?)
  `);
  const info = stmt.run(email, passwordHash, STATUSES.APPROVED, 'Адміністратор');
  return { id: info.lastInsertRowid, email, role: 'admin', status: STATUSES.APPROVED };
}

async function authenticate(email, password, options = {}) {
  const user = findUserByEmail(email);
  if (!user) {
    throw createError(401, 'Невірний логін або пароль');
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw createError(401, 'Невірний логін або пароль');
  }

  if (options.requireRole && user.role !== options.requireRole) {
    throw createError(403, 'Недостатньо прав для доступу');
  }

  if (options.requireApproved && user.status !== STATUSES.APPROVED) {
    if (user.status === STATUSES.PENDING) {
      throw createError(403, 'Заявка ще не підтверджена адміністратором');
    }
    if (user.status === STATUSES.BANNED) {
      throw createError(403, 'Обліковий запис заблокований');
    }
    throw createError(403, 'Обмежений доступ до системи');
  }

  db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  return mapUser(user);
}

async function registerUser(data) {
  const existing = findUserByEmail(data.email);
  if (existing) {
    throw createError(409, 'Користувач із такою поштою вже існує');
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const stmt = db.prepare(`
    INSERT INTO users (email, password_hash, role, status, full_name, phone, proof_path, created_via)
    VALUES (?, ?, 'donor', ?, ?, ?, ?, 'self-service')
  `);

  const info = stmt.run(
    data.email,
    passwordHash,
    STATUSES.PENDING,
    data.full_name,
    data.phone,
    data.proof_path || null
  );

  db.prepare(`
    INSERT INTO user_audit_log (user_id, action, details)
    VALUES (?, 'registration_submitted', ?)
  `).run(info.lastInsertRowid, JSON.stringify({ email: data.email }));

  return info.lastInsertRowid;
}

function listApplicants() {
  return db.prepare(`
    SELECT id, email, full_name, phone, proof_path, status, created_at
    FROM users
    WHERE role = 'donor' AND status IN ('pending', 'rejected')
    ORDER BY datetime(created_at) DESC
  `).all();
}

function listApprovedDonors() {
  return db.prepare(`
    SELECT id, email, full_name, phone, proof_path, approved_at, last_login_at
    FROM users
    WHERE role = 'donor' AND status = 'approved'
    ORDER BY datetime(approved_at) DESC
  `).all();
}

function listAdministrators() {
  return db.prepare(`
    SELECT id, email, full_name, status, last_login_at
    FROM users
    WHERE role = 'admin'
    ORDER BY datetime(created_at) DESC
  `).all();
}

function updateUserStatus(userId, status, performedBy, options = {}) {
  const user = findUserById(userId);
  if (!user) {
    throw createError(404, 'Користувача не знайдено');
  }

  let approvedAt = user.approved_at;
  let bannedAt = user.banned_at;
  if (status === STATUSES.APPROVED) {
    approvedAt = new Date().toISOString();
    bannedAt = null;
  } else if (status === STATUSES.BANNED) {
    bannedAt = new Date().toISOString();
  }

  db.prepare(`
    UPDATE users
    SET status = ?,
        approved_at = COALESCE(?, approved_at),
        banned_at = ?,
        notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(status, approvedAt, bannedAt, options.notes || null, userId);

  db.prepare(`
    INSERT INTO user_audit_log (user_id, action, details, performed_by)
    VALUES (?, ?, ?, ?)
  `).run(userId, `status_${status}`, JSON.stringify(options || {}), performedBy || null);

  if (options.role) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(options.role, userId);
  }
}

function assignRole(userId, role, performedBy) {
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
  db.prepare(`
    INSERT INTO user_audit_log (user_id, action, details, performed_by)
    VALUES (?, 'role_changed', ?, ?)
  `).run(userId, JSON.stringify({ role }), performedBy || null);
}

function updateProofPath(userId, proofPath) {
  db.prepare('UPDATE users SET proof_path = ? WHERE id = ?').run(proofPath, userId);
  db.prepare(`
    INSERT INTO user_audit_log (user_id, action, details)
    VALUES (?, 'proof_updated', ?)
  `).run(userId, JSON.stringify({ proof_path: proofPath }));
}

module.exports = {
  STATUSES,
  ensureAdminAccount,
  authenticate,
  registerUser,
  listApplicants,
  listApprovedDonors,
  listAdministrators,
  updateUserStatus,
  assignRole,
  updateProofPath
};
