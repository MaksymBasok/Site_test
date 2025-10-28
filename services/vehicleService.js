const { body, validationResult } = require('express-validator');
const createError = require('http-errors');
const db = require('../db');

const vehicleValidators = [
  body('name').trim().isLength({ min: 2 }).withMessage('Назва закоротка').escape(),
  body('status').trim().isLength({ min: 3 }).withMessage('Статус закороткий').escape(),
  body('category').optional({ checkFalsy: true }).trim().isLength({ max: 50 }).escape(),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 800 }).escape(),
  body('image_path').optional({ checkFalsy: true }).trim().isLength({ max: 255 })
];

function listVehicles() {
  return db.prepare(`
    SELECT id, name, description, status, image_path, category
    FROM vehicles
    ORDER BY id ASC
  `).all();
}

function createVehicle(data) {
  const stmt = db.prepare(`
    INSERT INTO vehicles (name, description, status, image_path, category)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(data.name, data.description || null, data.status, data.image_path || null, data.category || null);
  return info.lastInsertRowid;
}

function updateVehicle(id, data) {
  db.prepare(`
    UPDATE vehicles
    SET name = ?,
        description = ?,
        status = ?,
        image_path = ?,
        category = ?
    WHERE id = ?
  `).run(data.name, data.description || null, data.status, data.image_path || null, data.category || null, id);
}

function deleteVehicle(id) {
  db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
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
  vehicleValidators,
  listVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  validate
};
