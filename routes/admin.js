const express = require('express');
const { body, validationResult } = require('express-validator');
const donationService = require('../services/donationService');
const volunteerService = require('../services/volunteerService');
const withdrawalService = require('../services/withdrawalService');
const reviewService = require('../services/reviewService');
const feedbackService = require('../services/feedbackService');
const exportService = require('../services/exportService');
const {
  authenticate,
  listApplicants,
  listApprovedDonors,
  listAdministrators,
  listAllUsers,
  listUserAuditLogs,
  listAdminNotesByUsers,
  createAdminNote,
  updateUserStatus,
  assignRole,
  STATUSES
} = require('../services/userService');
const {
  getTotals,
  listGoals,
  listBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  createGoal,
  updateGoal,
  setActiveGoal,
  bankAccountValidators,
  validate: validateFundraising,
  listWithdrawals
} = require('../services/fundraisingService');
const {
  listVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  vehicleValidators,
  validate: validateVehicles
} = require('../services/vehicleService');
const {
  listContentBlocks,
  upsertContentBlock,
  listMedia,
  createMediaLink,
  updateMediaLink,
  deleteMediaLink,
  listArticles,
  createArticle,
  updateArticle,
  deleteArticle
} = require('../services/contentService');
const { requireAdmin } = require('../middleware/auth');
const { storeFormState } = require('../utils/formState');
const pendingActionsService = require('../services/pendingActionsService');

const router = express.Router();

const goalValidators = [
  body('title').trim().isLength({ min: 3 }).withMessage('Вкажіть назву цілі').escape(),
  body('target_amount').isInt({ min: 1000 }).withMessage('Некоректна сума збору'),
  body('status').isIn(['draft', 'active', 'archived']).withMessage('Некоректний статус')
];

const articleValidators = [
  body('title').trim().isLength({ min: 5 }).withMessage('Заголовок закороткий').escape(),
  body('excerpt').optional({ checkFalsy: true }).trim().isLength({ max: 500 }).escape(),
  body('body').optional({ checkFalsy: true }).trim(),
  body('cover_image').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('published_at').optional({ checkFalsy: true }).isISO8601().withMessage('Некоректна дата публікації')
];

const mediaValidators = [
  body('title').trim().isLength({ min: 3 }).withMessage('Назва матеріалу закоротка').escape(),
  body('summary').optional({ checkFalsy: true }).trim().isLength({ max: 500 }).escape(),
  body('url').trim().isURL().withMessage('Вкажіть коректне посилання'),
  body('image_path').optional({ checkFalsy: true }).trim().isLength({ max: 255 })
];

router.get('/login', (req, res) => {
  if (req.session.user && req.session.user.role === 'admin') {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/login', {
    title: 'Адмін-панель',
    csrfToken: res.locals.csrfToken
  });
});

router.post('/login', async (req, res, next) => {
  try {
    const user = await authenticate(req.body.email, req.body.password, { requireRole: 'admin' });
    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      full_name: user.full_name
    };
    return res.redirect('/admin/dashboard');
  } catch (error) {
    if (!error.status) {
      return next(error);
    }
    req.flash('error', error.message || 'Не вдалося увійти');
    return res.redirect('/admin/login');
  }
});

router.post('/logout', requireAdmin, (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

router.get('/dashboard', requireAdmin, (req, res) => {
  const totals = getTotals();
  const donations = donationService.listRecent(15);
  const volunteers = volunteerService.listRecent(10);
  const withdrawals = listWithdrawals(15);
  const applicants = listApplicants();
  const donors = listApprovedDonors();
  const admins = listAdministrators();
  const allUsers = listAllUsers();
  const userIds = allUsers.map((user) => user.id);
  const auditLogs = listUserAuditLogs(userIds);
  const adminNotes = listAdminNotesByUsers(userIds);
  const auditByUser = auditLogs.reduce((acc, log) => {
    if (!acc[log.user_id]) acc[log.user_id] = [];
    acc[log.user_id].push(log);
    return acc;
  }, {});
  const notesByUser = adminNotes.reduce((acc, note) => {
    if (!acc[note.user_id]) acc[note.user_id] = [];
    acc[note.user_id].push(note);
    return acc;
  }, {});
  const userStats = allUsers.reduce((acc, user) => {
    acc.total += 1;
    acc.roles[user.role] = (acc.roles[user.role] || 0) + 1;
    acc.statuses[user.status] = (acc.statuses[user.status] || 0) + 1;
    if (user.approved_at) {
      acc.approved += 1;
    }
    if (user.status === STATUSES.PENDING) {
      acc.pending += 1;
    }
    return acc;
  }, { total: 0, approved: 0, pending: 0, roles: {}, statuses: {} });
  const bankAccounts = listBankAccounts();
  const goals = listGoals();
  const vehicles = listVehicles();
  const reviews = reviewService.listAll();
  const feedback = feedbackService.listRecent(10);
  const contentBlocks = listContentBlocks();
  const media = listMedia();
  const articles = listArticles();
  const pendingActions = pendingActionsService.listAll();

  res.render('admin/dashboard', {
    title: 'Кабінет адміністратора',
    totals,
    donations,
    volunteers,
    withdrawals,
    applicants,
    donors,
    admins,
    allUsers,
    auditByUser,
    notesByUser,
    userStats,
    bankAccounts,
    goals,
    vehicles,
    reviews,
    feedback,
    contentBlocks,
    media,
    articles,
    pendingActions,
    STATUSES,
    exportDatasets: exportService.datasets,
    exportMeta: exportService.meta,
    csrfToken: res.locals.csrfToken
  });
});

router.post('/donations', requireAdmin, donationService.donationValidators, (req, res, next) => {
  try {
    donationService.validate(req);
    donationService.createDonation({
      donor_name: req.body.donor_name,
      amount: Number(req.body.amount),
      currency: req.body.currency || 'UAH',
      message: req.body.message,
      public: req.body.public === 'on'
    });
    req.flash('success', 'Донат додано.');
    res.redirect('/admin/dashboard#finance');
  } catch (error) {
    if (error.status === 422) {
      const formId = req.body._formId || 'donation:new';
      storeFormState(req, formId, { values: req.body, errors: error.fields, message: error.message });
      req.flash('error', error.message);
      return res.redirect('/admin/dashboard#finance');
    }
    return next(error);
  }
});

router.post('/withdrawals', requireAdmin, withdrawalService.withdrawalValidators, (req, res, next) => {
  try {
    withdrawalService.validate(req);
    withdrawalService.createWithdrawal({
      amount: Number(req.body.amount),
      description: req.body.description
    }, req.session.user.id);
    req.flash('success', 'Витрату зафіксовано.');
    res.redirect('/admin/dashboard#finance');
  } catch (error) {
    if (error.status === 422) {
      const formId = req.body._formId || 'withdrawal:new';
      storeFormState(req, formId, { values: req.body, errors: error.fields, message: error.message });
      req.flash('error', error.message);
      return res.redirect('/admin/dashboard#finance');
    }
    return next(error);
  }
});

router.post('/users/:id/approve', requireAdmin, (req, res, next) => {
  try {
    updateUserStatus(Number(req.params.id), STATUSES.APPROVED, req.session.user.id, { role: req.body.role || 'donor' });
    req.flash('success', 'Заявку підтверджено.');
    res.redirect('/admin/dashboard#users');
  } catch (error) {
    return next(error);
  }
});

router.post('/users/:id/reject', requireAdmin, (req, res, next) => {
  try {
    updateUserStatus(Number(req.params.id), STATUSES.REJECTED, req.session.user.id, { notes: req.body.notes });
    req.flash('info', 'Заявку відхилено.');
    res.redirect('/admin/dashboard#users');
  } catch (error) {
    return next(error);
  }
});

router.post('/users/:id/ban', requireAdmin, (req, res, next) => {
  try {
    updateUserStatus(Number(req.params.id), STATUSES.BANNED, req.session.user.id, { notes: req.body.notes });
    req.flash('warning', 'Користувача заблоковано.');
    res.redirect('/admin/dashboard#users');
  } catch (error) {
    return next(error);
  }
});

router.post('/users/:id/role', requireAdmin, (req, res, next) => {
  try {
    assignRole(Number(req.params.id), req.body.role, req.session.user.id);
    req.flash('success', 'Роль оновлено.');
    res.redirect('/admin/dashboard#users');
  } catch (error) {
    return next(error);
  }
});

router.post('/users/:id/status', requireAdmin, (req, res, next) => {
  const redirectUrl = req.body.redirect || '/admin/dashboard#users';
  const formId = req.body._formId || `user-status:${req.params.id}`;
  try {
    const status = req.body.status;
    if (!status || !Object.values(STATUSES).includes(status)) {
      const message = 'Некоректний статус користувача.';
      storeFormState(req, formId, {
        values: req.body,
        errors: [{ field: 'status', message }],
        message
      });
      req.flash('error', message);
      return res.redirect(redirectUrl);
    }
    updateUserStatus(Number(req.params.id), status, req.session.user.id, { notes: req.body.notes });
    req.flash('success', 'Статус оновлено.');
    return res.redirect(redirectUrl);
  } catch (error) {
    if (error.status === 404) {
      const message = error.message || 'Користувача не знайдено.';
      storeFormState(req, formId, {
        values: req.body,
        errors: [{ field: 'status', message }],
        message
      });
      req.flash('error', message);
      return res.redirect(redirectUrl);
    }
    if (error.status === 422 && error.fields) {
      storeFormState(req, formId, {
        values: req.body,
        errors: error.fields,
        message: error.message
      });
      req.flash('error', error.message);
      return res.redirect(redirectUrl);
    }
    return next(error);
  }
});

router.post('/users/:id/notes', requireAdmin, (req, res, next) => {
  const formId = req.body._formId || `user-note:${req.params.id}`;
  try {
    createAdminNote(Number(req.params.id), req.body.note, req.session.user.id);
    req.flash('success', 'Примітку додано.');
    return res.redirect(req.body.redirect || '/admin/dashboard#users');
  } catch (error) {
    if (error.status === 422) {
      storeFormState(req, formId, {
        values: req.body,
        errors: [{ field: 'note', message: error.message }],
        message: error.message
      });
      req.flash('error', error.message);
      return res.redirect(req.body.redirect || '/admin/dashboard#users');
    }
    return next(error);
  }
});

router.post('/bank-accounts', requireAdmin, bankAccountValidators, (req, res, next) => {
  try {
    validateFundraising(req);
    createBankAccount({
      label: req.body.label,
      recipient: req.body.recipient,
      iban: req.body.iban,
      edrpou: req.body.edrpou,
      purpose: req.body.purpose
    });
    req.flash('success', 'Реквізити додано.');
    res.redirect('/admin/dashboard#finance');
  } catch (error) {
    if (error.status === 422) {
      const formId = req.body._formId || 'bank-account:new';
      storeFormState(req, formId, { values: req.body, errors: error.fields, message: error.message });
      req.flash('error', error.message);
      return res.redirect('/admin/dashboard#finance');
    }
    return next(error);
  }
});

router.post('/bank-accounts/:id', requireAdmin, bankAccountValidators, (req, res, next) => {
  try {
    validateFundraising(req);
    updateBankAccount(Number(req.params.id), {
      label: req.body.label,
      recipient: req.body.recipient,
      iban: req.body.iban,
      edrpou: req.body.edrpou,
      purpose: req.body.purpose
    });
    req.flash('success', 'Реквізити оновлено.');
    res.redirect('/admin/dashboard#finance');
  } catch (error) {
    if (error.status === 422) {
      const formId = req.body._formId || `bank-account:${req.params.id}`;
      storeFormState(req, formId, { values: req.body, errors: error.fields, message: error.message });
      req.flash('error', error.message);
      return res.redirect('/admin/dashboard#finance');
    }
    return next(error);
  }
});

router.post('/bank-accounts/:id/delete', requireAdmin, (req, res, next) => {
  try {
    deleteBankAccount(Number(req.params.id));
    req.flash('info', 'Реквізити видалено.');
    res.redirect('/admin/dashboard#finance');
  } catch (error) {
    return next(error);
  }
});

router.post('/goals', requireAdmin, goalValidators, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array();
    const formId = req.body._formId || 'goal:new';
    storeFormState(req, formId, { values: req.body, errors: details.map((item) => ({ field: item.path, message: item.msg })), message: details[0].msg });
    req.flash('error', details[0].msg);
    return res.redirect('/admin/dashboard#finance');
  }
  try {
    const goalId = createGoal({
      title: req.body.title,
      description: req.body.description,
      target_amount: Number(req.body.target_amount),
      status: req.body.status
    });
    if (req.body.status === 'active') {
      setActiveGoal(goalId);
    }
    req.flash('success', 'Ціль створено.');
    res.redirect('/admin/dashboard#finance');
  } catch (error) {
    return next(error);
  }
});

router.post('/goals/:id', requireAdmin, goalValidators, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array();
    const formId = req.body._formId || `goal:${req.params.id}`;
    storeFormState(req, formId, { values: req.body, errors: details.map((item) => ({ field: item.path, message: item.msg })), message: details[0].msg });
    req.flash('error', details[0].msg);
    return res.redirect('/admin/dashboard#finance');
  }
  try {
    updateGoal(Number(req.params.id), {
      title: req.body.title,
      description: req.body.description,
      target_amount: Number(req.body.target_amount),
      status: req.body.status
    });
    if (req.body.status === 'active') {
      setActiveGoal(Number(req.params.id));
    }
    req.flash('success', 'Ціль оновлено.');
    res.redirect('/admin/dashboard#finance');
  } catch (error) {
    return next(error);
  }
});

router.post('/vehicles', requireAdmin, vehicleValidators, (req, res, next) => {
  try {
    validateVehicles(req);
    createVehicle({
      name: req.body.name,
      description: req.body.description,
      status: req.body.status,
      image_path: req.body.image_path,
      category: req.body.category
    });
    req.flash('success', 'Авто додано.');
    res.redirect('/admin/dashboard#vehicles');
  } catch (error) {
    if (error.status === 422) {
      const formId = req.body._formId || 'vehicle:new';
      storeFormState(req, formId, { values: req.body, errors: error.fields, message: error.message });
      req.flash('error', error.message);
      return res.redirect('/admin/dashboard#vehicles');
    }
    return next(error);
  }
});

router.post('/vehicles/:id', requireAdmin, vehicleValidators, (req, res, next) => {
  try {
    validateVehicles(req);
    updateVehicle(Number(req.params.id), {
      name: req.body.name,
      description: req.body.description,
      status: req.body.status,
      image_path: req.body.image_path,
      category: req.body.category
    });
    req.flash('success', 'Авто оновлено.');
    res.redirect('/admin/dashboard#vehicles');
  } catch (error) {
    if (error.status === 422) {
      const formId = req.body._formId || `vehicle:${req.params.id}`;
      storeFormState(req, formId, { values: req.body, errors: error.fields, message: error.message });
      req.flash('error', error.message);
      return res.redirect('/admin/dashboard#vehicles');
    }
    return next(error);
  }
});

router.post('/vehicles/:id/delete', requireAdmin, (req, res, next) => {
  try {
    deleteVehicle(Number(req.params.id));
    req.flash('info', 'Авто видалено.');
    res.redirect('/admin/dashboard#vehicles');
  } catch (error) {
    return next(error);
  }
});

router.post('/content-blocks/:slug', requireAdmin, (req, res, next) => {
  try {
    upsertContentBlock(req.params.slug, {
      title: req.body.title,
      body: req.body.body
    }, req.session.user.id);
    req.flash('success', 'Контент оновлено.');
    res.redirect('/admin/dashboard#content');
  } catch (error) {
    return next(error);
  }
});

router.post('/media', requireAdmin, mediaValidators, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array();
    const formId = req.body._formId || 'media:new';
    storeFormState(req, formId, { values: req.body, errors: details.map((item) => ({ field: item.path, message: item.msg })), message: details[0].msg });
    req.flash('error', details[0].msg);
    return res.redirect('/admin/dashboard#content');
  }
  try {
    createMediaLink({
      title: req.body.title,
      summary: req.body.summary,
      url: req.body.url,
      image_path: req.body.image_path
    });
    req.flash('success', 'Медіаматеріал додано.');
    res.redirect('/admin/dashboard#content');
  } catch (error) {
    return next(error);
  }
});

router.post('/media/:id', requireAdmin, mediaValidators, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array();
    const formId = req.body._formId || `media:${req.params.id}`;
    storeFormState(req, formId, { values: req.body, errors: details.map((item) => ({ field: item.path, message: item.msg })), message: details[0].msg });
    req.flash('error', details[0].msg);
    return res.redirect('/admin/dashboard#content');
  }
  try {
    updateMediaLink(Number(req.params.id), {
      title: req.body.title,
      summary: req.body.summary,
      url: req.body.url,
      image_path: req.body.image_path
    });
    req.flash('success', 'Медіаматеріал оновлено.');
    res.redirect('/admin/dashboard#content');
  } catch (error) {
    return next(error);
  }
});

router.post('/media/:id/delete', requireAdmin, (req, res, next) => {
  try {
    deleteMediaLink(Number(req.params.id));
    req.flash('info', 'Медіаматеріал видалено.');
    res.redirect('/admin/dashboard#content');
  } catch (error) {
    return next(error);
  }
});

router.post('/articles', requireAdmin, articleValidators, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array();
    const formId = req.body._formId || 'article:new';
    storeFormState(req, formId, { values: req.body, errors: details.map((item) => ({ field: item.path, message: item.msg })), message: details[0].msg });
    req.flash('error', details[0].msg);
    return res.redirect('/admin/dashboard#content');
  }
  try {
    createArticle({
      title: req.body.title,
      excerpt: req.body.excerpt,
      body: req.body.body,
      cover_image: req.body.cover_image,
      published_at: req.body.published_at || null
    });
    req.flash('success', 'Статтю додано.');
    res.redirect('/admin/dashboard#content');
  } catch (error) {
    return next(error);
  }
});

router.post('/articles/:id', requireAdmin, articleValidators, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array();
    const formId = req.body._formId || `article:${req.params.id}`;
    storeFormState(req, formId, { values: req.body, errors: details.map((item) => ({ field: item.path, message: item.msg })), message: details[0].msg });
    req.flash('error', details[0].msg);
    return res.redirect('/admin/dashboard#content');
  }
  try {
    updateArticle(Number(req.params.id), {
      title: req.body.title,
      excerpt: req.body.excerpt,
      body: req.body.body,
      cover_image: req.body.cover_image,
      published_at: req.body.published_at || null
    });
    req.flash('success', 'Статтю оновлено.');
    res.redirect('/admin/dashboard#content');
  } catch (error) {
    return next(error);
  }
});

router.post('/articles/:id/delete', requireAdmin, (req, res, next) => {
  try {
    deleteArticle(Number(req.params.id));
    req.flash('info', 'Статтю видалено.');
    res.redirect('/admin/dashboard#content');
  } catch (error) {
    return next(error);
  }
});

router.post('/reviews', requireAdmin, reviewService.reviewValidators, (req, res, next) => {
  try {
    reviewService.validate(req);
    reviewService.createReview({
      author_name: req.body.author_name,
      rating: req.body.rating ? Number(req.body.rating) : null,
      message: req.body.message,
      public: req.body.public === 'on'
    });
    req.flash('success', 'Відгук додано.');
    res.redirect('/admin/dashboard#community');
  } catch (error) {
    if (error.status === 422) {
      const formId = req.body._formId || 'review:new';
      storeFormState(req, formId, { values: req.body, errors: error.fields, message: error.message });
      req.flash('error', error.message);
      return res.redirect('/admin/dashboard#community');
    }
    return next(error);
  }
});

router.post('/reviews/:id/toggle', requireAdmin, (req, res, next) => {
  try {
    reviewService.toggleVisibility(Number(req.params.id), req.body.public === 'on');
    req.flash('success', 'Відображення відгуку оновлено.');
    res.redirect('/admin/dashboard#community');
  } catch (error) {
    return next(error);
  }
});

router.post('/export', requireAdmin, (req, res, next) => {
  try {
    const requested = req.body.datasets || req.body.selection;
    if (!requested || (Array.isArray(requested) && requested.length === 0)) {
      return res.status(400).json({ error: 'Оберіть хоча б один розділ для експорту.' });
    }

    const selection = exportService.normalizeSelection(requested);
    if (!selection.length) {
      return res.status(400).json({ error: 'Некоректні параметри експорту.' });
    }

    const datasets = exportService.buildDatasets(selection);

    if ((req.body.format || '').toLowerCase() === 'json') {
      return res.json({
        generatedAt: new Date().toISOString(),
        datasets
      });
    }

    const archive = exportService.createArchive(datasets, { prefix: 'volonterka' });
    const filename = exportService.generateFilename('datasets');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    archive.on('error', (error) => {
      next(error);
    });

    archive.pipe(res);
    archive.finalize();
  } catch (err) {
    return next(err);
  }
});

router.post('/pending-actions/:id/approve', requireAdmin, (req, res, next) => {
  try {
    pendingActionsService.approveAction(Number(req.params.id), req.session.user.id);
    req.flash('success', 'Заявку підтверджено та застосовано.');
    res.redirect('/admin/dashboard#requests');
  } catch (error) {
    if (error.status) {
      req.flash('error', error.message);
      return res.redirect('/admin/dashboard#requests');
    }
    return next(error);
  }
});

router.post('/pending-actions/:id/reject', requireAdmin, (req, res, next) => {
  try {
    pendingActionsService.rejectAction(Number(req.params.id), req.session.user.id, req.body.reason);
    req.flash('info', 'Заявку відхилено.');
    res.redirect('/admin/dashboard#requests');
  } catch (error) {
    if (error.status) {
      req.flash('error', error.message);
      return res.redirect('/admin/dashboard#requests');
    }
    return next(error);
  }
});

router.post('/pending-actions/:id/revert', requireAdmin, (req, res, next) => {
  try {
    pendingActionsService.revertAction(Number(req.params.id));
    req.flash('warning', 'Рішення скасовано. Заявку повернуто в роботу.');
    res.redirect('/admin/dashboard#requests');
  } catch (error) {
    if (error.status) {
      req.flash('error', error.message);
      return res.redirect('/admin/dashboard#requests');
    }
    return next(error);
  }
});

module.exports = router;
