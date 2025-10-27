const express = require('express');
const { body, validationResult } = require('express-validator');
const path = require('path');
const PDFDocument = require('pdfkit');
const donationService = require('../services/donationService');
const volunteerService = require('../services/volunteerService');
const withdrawalService = require('../services/withdrawalService');
const reviewService = require('../services/reviewService');
const feedbackService = require('../services/feedbackService');
const {
  authenticate,
  listApplicants,
  listApprovedDonors,
  listAdministrators,
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
  const bankAccounts = listBankAccounts();
  const goals = listGoals();
  const vehicles = listVehicles();
  const reviews = reviewService.listAll();
  const feedback = feedbackService.listRecent(10);
  const contentBlocks = listContentBlocks();
  const media = listMedia();
  const articles = listArticles();

  res.render('admin/dashboard', {
    title: 'Кабінет адміністратора',
    totals,
    donations,
    volunteers,
    withdrawals,
    applicants,
    donors,
    admins,
    bankAccounts,
    goals,
    vehicles,
    reviews,
    feedback,
    contentBlocks,
    media,
    articles,
    STATUSES,
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
    req.flash('error', errors.array()[0].msg);
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
    req.flash('error', errors.array()[0].msg);
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
    req.flash('error', errors.array()[0].msg);
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
    req.flash('error', errors.array()[0].msg);
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
    req.flash('error', errors.array()[0].msg);
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
    req.flash('error', errors.array()[0].msg);
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

router.get('/export/users.pdf', requireAdmin, (req, res, next) => {
  try {
    const applicants = listApplicants();
    const donors = listApprovedDonors();
    const admins = listAdministrators();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="volonterka-users-report.pdf"');

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.on('error', (err) => {
      // Ensure stream ends on error to avoid broken download
      try { res.end(); } catch (_) {}
      console.error('PDF generation error:', err);
    });
    doc.pipe(res);

    const fs = require('fs');
    const regularFont = path.join(__dirname, '..', 'public', 'fonts', 'Montserrat-Regular.ttf');
    const semiBoldFont = path.join(__dirname, '..', 'public', 'fonts', 'Montserrat-SemiBold.ttf');

    const hasRegular = fs.existsSync(regularFont);
    const hasSemiBold = fs.existsSync(semiBoldFont);
    if (hasRegular) doc.registerFont('Montserrat-Regular', regularFont);
    if (hasSemiBold) doc.registerFont('Montserrat-SemiBold', semiBoldFont);

    const titleFont = hasSemiBold ? 'Montserrat-SemiBold' : 'Helvetica-Bold';
    const textFont = hasRegular ? 'Montserrat-Regular' : 'Helvetica';

    doc.font(titleFont).fontSize(18).text('Звіт по користувачах фонду', { align: 'center' });
    doc.moveDown();

    doc.font(titleFont).fontSize(14).text('Адміністратори', { underline: true });
    admins.forEach((admin) => {
      doc.font(textFont).fontSize(11).text(`${admin.full_name || admin.email} — ${admin.email}`);
      if (admin.last_login_at) {
        doc.fontSize(9).fillColor('gray').text(`Останній вхід: ${admin.last_login_at}`, { indent: 20 });
        doc.fillColor('black');
      }
    });
    doc.moveDown();

    doc.font(titleFont).fontSize(14).text('Підтверджені донатери', { underline: true });
    donors.forEach((donor) => {
      doc.font(textFont).fontSize(11).text(`${donor.full_name || donor.email} — ${donor.email}`);
      if (donor.phone) {
        doc.fontSize(9).fillColor('gray').text(`Телефон: ${donor.phone}`, { indent: 20 });
      }
      if (donor.approved_at) {
        doc.fontSize(9).fillColor('gray').text(`З нами з: ${donor.approved_at}`, { indent: 20 });
      }
      doc.fillColor('black');
    });
    doc.moveDown();

    doc.font(titleFont).fontSize(14).text('Заявки на розгляд', { underline: true });
    applicants.forEach((applicant) => {
      doc.font(textFont).fontSize(11).text(`${applicant.full_name || applicant.email} — ${applicant.email}`);
      if (applicant.phone) {
        doc.fontSize(9).fillColor('gray').text(`Телефон: ${applicant.phone}`, { indent: 20 });
      }
      doc.fontSize(9).fillColor('gray').text(`Статус: ${applicant.status}`, { indent: 20 });
      doc.fillColor('black');
    });

    doc.end();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
