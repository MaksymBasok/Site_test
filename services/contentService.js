const { body, validationResult } = require('express-validator');
const createError = require('http-errors');
const db = require('../db');

const contentValidators = [
  body('title').trim().isLength({ min: 3 }).withMessage('Назва закоротка').escape(),
  body('body').optional({ checkFalsy: true }).trim().isLength({ max: 5000 }).withMessage('Занадто довгий текст'),
  body('slug').optional({ checkFalsy: true }).trim().isSlug().withMessage('Некоректний ключ').escape()
];

function listMedia() {
  return db.prepare(`
    SELECT id, title, summary, url, image_path
    FROM media_links
    ORDER BY id ASC
  `).all();
}

function createMediaLink(data) {
  const stmt = db.prepare(`
    INSERT INTO media_links (title, summary, url, image_path)
    VALUES (?, ?, ?, ?)
  `);
  const info = stmt.run(data.title, data.summary || null, data.url, data.image_path || null);
  return info.lastInsertRowid;
}

function updateMediaLink(id, data) {
  db.prepare(`
    UPDATE media_links
    SET title = ?,
        summary = ?,
        url = ?,
        image_path = ?
    WHERE id = ?
  `).run(data.title, data.summary || null, data.url, data.image_path || null, id);
}

function deleteMediaLink(id) {
  db.prepare('DELETE FROM media_links WHERE id = ?').run(id);
}

function listDocuments() {
  return db.prepare(`
    SELECT id, title, description, file_path, file_type
    FROM documents
    ORDER BY id ASC
  `).all();
}

function listContentBlocks() {
  return db.prepare(`
    SELECT slug, title, body
    FROM content_blocks
    ORDER BY slug ASC
  `).all();
}

function getContentBlock(slug) {
  return db.prepare('SELECT slug, title, body FROM content_blocks WHERE slug = ?').get(slug);
}

function upsertContentBlock(slug, data, userId) {
  const existing = getContentBlock(slug);
  if (existing) {
    db.prepare(`
      UPDATE content_blocks
      SET title = ?,
          body = ?,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = ?
      WHERE slug = ?
    `).run(data.title || null, data.body || null, userId || null, slug);
  } else {
    db.prepare(`
      INSERT INTO content_blocks (slug, title, body, updated_by)
      VALUES (?, ?, ?, ?)
    `).run(slug, data.title || null, data.body || null, userId || null);
  }
}

function listArticles() {
  return db.prepare(`
    SELECT id, title, excerpt, body, cover_image, published_at
    FROM site_articles
    ORDER BY (published_at IS NULL) ASC, datetime(published_at) DESC, datetime(updated_at) DESC
  `).all();
}

function createArticle(data) {
  const stmt = db.prepare(`
    INSERT INTO site_articles (title, excerpt, body, cover_image, published_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(data.title, data.excerpt || null, data.body || null, data.cover_image || null, data.published_at || null);
  return info.lastInsertRowid;
}

function updateArticle(id, data) {
  db.prepare(`
    UPDATE site_articles
    SET title = ?,
        excerpt = ?,
        body = ?,
        cover_image = ?,
        published_at = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(data.title, data.excerpt || null, data.body || null, data.cover_image || null, data.published_at || null, id);
}

function deleteArticle(id) {
  db.prepare('DELETE FROM site_articles WHERE id = ?').run(id);
}

function validate(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError(422, errors.array()[0].msg);
  }
}

module.exports = {
  contentValidators,
  listMedia,
  createMediaLink,
  updateMediaLink,
  deleteMediaLink,
  listDocuments,
  listContentBlocks,
  getContentBlock,
  upsertContentBlock,
  listArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  validate
};
