const createHttpError = require('http-errors');

function notFoundHandler(req, res, next) {
  if (req.accepts('html')) {
    return res.status(404).render('404', { title: 'Сторінку не знайдено' });
  }
  if (req.accepts('json')) {
    return res.status(404).json({ message: 'Not Found' });
  }
  return next(createHttpError(404));
}

function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isApiRoute = req.path.startsWith('/api/');

  if (err.code === 'EBADCSRFTOKEN') {
    if (isApiRoute || req.accepts('json')) {
      return res.status(403).json({ message: 'Invalid CSRF token' });
    }
    req.flash('error', 'Сесію безпеки скинуто. Спробуйте ще раз.');
    return res.redirect('back');
  }

  if (isApiRoute || req.accepts('json')) {
    return res.status(status).json({
      message: err.message || 'Internal Server Error'
    });
  }

  console.error(err);
  return res.status(status).render('500', {
    title: 'Сталася помилка',
    message: err.message || 'Невідома помилка'
  });
}

module.exports = { notFoundHandler, errorHandler };
