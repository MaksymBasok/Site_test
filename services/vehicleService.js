const db = require('../db');

function listVehicles() {
  return db.prepare(`
    SELECT id, name, description, status, image_path, category
    FROM vehicles
    ORDER BY id ASC
  `).all();
}

module.exports = { listVehicles };
