const createError = require('http-errors');

function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  if (req.accepts('html')) {
    req.flash('error', 'Потрібно увійти до системи');
    return res.redirect('/admin/login');
  }
  return next(createError(401, 'Unauthorized'));
}

module.exports = { requireAuth };
