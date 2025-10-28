const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const createError = require('http-errors');
const csrfProtection = require('../middleware/csrf');
const { registerUser, authenticate } = require('../services/userService');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'proofs');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype) {
      return cb(createError(400, 'Невідомий тип файлу'));
    }
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      return cb(null, true);
    }
    return cb(createError(400, 'Дозволені лише зображення або PDF файли')); 
  }
});

const registrationValidators = [
  body('full_name').trim().isLength({ min: 3 }).withMessage('Вкажіть ПІБ (мінімум 3 символи)').escape(),
  body('email').isEmail().withMessage('Некоректна email адреса').normalizeEmail(),
  body('phone').trim().matches(/^\+?\d{10,15}$/).withMessage('Вкажіть коректний номер телефону').escape(),
  body('password').isLength({ min: 8 }).withMessage('Пароль має бути не коротшим за 8 символів'),
  body('confirm_password').custom((value, { req }) => value === req.body.password).withMessage('Паролі не співпадають'),
  body('agree').equals('on').withMessage('Потрібно погодитись із правилами')
];

router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect(req.session.user.role === 'admin' ? '/admin/dashboard' : '/live');
  }
  const loginHints = {
    adminEmail: process.env.ADMIN_EMAIL || null,
    adminPasswordSet: Boolean(process.env.ADMIN_PASSWORD)
  };

  res.render('auth/login', {
    title: 'Вхід до кабінету',
    csrfToken: res.locals.csrfToken,
    loginHints
  });
});

router.post('/login', async (req, res, next) => {
  try {
    const user = await authenticate(req.body.email, req.body.password, { requireApproved: true });
    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      full_name: user.full_name
    };
    return res.redirect(user.role === 'admin' ? '/admin/dashboard' : '/live');
  } catch (error) {
    if (!error.status) {
      return next(error);
    }
    req.flash('error', error.message || 'Не вдалося увійти');
    return res.redirect('/auth/login');
  }
});

router.get('/register', (req, res) => {
  res.render('auth/register', {
    title: 'Стати донатером',
    csrfToken: res.locals.csrfToken
  });
});

router.post('/register', upload.single('proof'), csrfProtection, registrationValidators, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      req.flash('error', errors.array()[0].msg);
      return res.redirect('/auth/register');
    }

    const proofPath = req.file ? path.join('uploads', 'proofs', path.basename(req.file.path)) : null;
    await registerUser({
      full_name: req.body.full_name,
      email: req.body.email,
      phone: req.body.phone,
      password: req.body.password,
      proof_path: proofPath
    });
    req.flash('success', 'Заявку на доступ подано. Очікуйте підтвердження адміністратора.');
    return res.redirect('/auth/login');
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    if (error.status) {
      req.flash('error', error.message);
      return res.redirect('/auth/register');
    }
    return next(error);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
