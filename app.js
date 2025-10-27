require('dotenv').config();

const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');

const { ensureAdminAccount } = require('./services/userService');
const pagesRouter = require('./routes/pages');
const apiRouter = require('./routes/api');
const adminRouter = require('./routes/admin');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandlers');

const app = express();
const port = process.env.PORT || 3000;

ensureAdminAccount().catch((error) => {
  console.error('Failed to ensure admin account exists', error);
  process.exit(1);
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(hpp());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(morgan('combined'));

app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'],
  maxAge: '7d'
}));

app.use(session({
  store: new SQLiteStore({
    dir: path.join(__dirname, 'db'),
    db: 'sessions.sqlite'
  }),
  name: 'volonterka.sid',
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use(flash());

const csrfProtection = csrf();

app.use((req, res, next) => {
  if (req.path.startsWith('/api/') && ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  return csrfProtection(req, res, next);
});

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
  res.locals.currentPath = req.path;
  res.locals.flash = req.flash();
  next();
});

app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
}));

app.use('/', pagesRouter);
app.use('/api', apiRouter);
app.use('/admin', adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Volonterka app listening on port ${port}`);
  });
}

module.exports = app;
