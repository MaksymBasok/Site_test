const createError = require('http-errors');

function ensureAuthenticated(req, res, next, options = {}) {
  if (!req.session || !req.session.user) {
    if (req.accepts('html')) {
      req.flash('error', 'Потрібно увійти до системи');
      return res.redirect(options.redirectTo || '/auth/login');
    }
    return next(createError(401, 'Unauthorized'));
  }

  const user = req.session.user;
  if (options.requireRole && user.role !== options.requireRole) {
    if (req.accepts('html')) {
      req.flash('error', 'Недостатньо прав для доступу');
      return res.redirect(options.fallback || '/');
    }
    return next(createError(403, 'Forbidden'));
  }

  if (options.requireApproved && user.status !== 'approved' && user.role !== 'admin') {
    if (req.accepts('html')) {
      req.flash('error', 'Доступ можливий лише після підтвердження адміністратора');
      return res.redirect(options.pendingRedirect || '/auth/login');
    }
    return next(createError(403, 'Forbidden'));
  }

  return next();
}

function requireAuth(req, res, next) {
  return ensureAuthenticated(req, res, next, { redirectTo: '/auth/login' });
}

function requireAdmin(req, res, next) {
  return ensureAuthenticated(req, res, next, { requireRole: 'admin', redirectTo: '/admin/login' });
}

function requireApprovedUser(req, res, next) {
  return ensureAuthenticated(req, res, next, {
    requireApproved: true,
    redirectTo: '/auth/login'
  });
}

module.exports = { requireAuth, requireAdmin, requireApprovedUser };
