const db = require('../db');

function listMedia() {
  return db.prepare(`
    SELECT title, summary, url, image_path
    FROM media_links
    ORDER BY id ASC
  `).all();
}

function listDocuments() {
  return db.prepare(`
    SELECT title, description, file_path, file_type
    FROM documents
    ORDER BY id ASC
  `).all();
}

module.exports = {
  listMedia,
  listDocuments
};
