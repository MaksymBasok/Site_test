const express = require('express');
const { authenticate } = require('../services/userService');
const donationService = require('../services/donationService');
const volunteerService = require('../services/volunteerService');
const withdrawalService = require('../services/withdrawalService');
const { getTotals } = require('../services/fundraisingService');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/login', {
    title: 'Адмін-панель',
    csrfToken: res.locals.csrfToken
  });
});

router.post('/login', async (req, res, next) => {
  try {
    const user = await authenticate(req.body.email, req.body.password);
    req.session.user = user;
    res.redirect('/admin/dashboard');
  } catch (error) {
    if (!error.status) {
      return next(error);
    }
    req.flash('error', error.message || 'Не вдалося увійти');
    return res.redirect('/admin/login');
  }
});

router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

router.get('/dashboard', requireAuth, (req, res) => {
  const totals = getTotals();
  const donations = donationService.listRecent(15);
  const volunteers = volunteerService.listRecent(15);
  const withdrawals = withdrawalService.listRecent(15);

  res.render('admin/dashboard', {
    title: 'Кабінет адміністратора',
    totals,
    donations,
    volunteers,
    withdrawals,
    csrfToken: res.locals.csrfToken
  });
});

router.post('/donations', requireAuth, donationService.donationValidators, (req, res, next) => {
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
    res.redirect('/admin/dashboard');
  } catch (error) {
    if (error.status === 422) {
      req.flash('error', error.message);
      return res.redirect('/admin/dashboard');
    }
    return next(error);
  }
});

router.post('/withdrawals', requireAuth, withdrawalService.withdrawalValidators, (req, res, next) => {
  try {
    withdrawalService.validate(req);
    withdrawalService.createWithdrawal({
      amount: Number(req.body.amount),
      description: req.body.description
    }, req.session.user.id);
    req.flash('success', 'Витрату зафіксовано.');
    res.redirect('/admin/dashboard');
  } catch (error) {
    if (error.status === 422) {
      req.flash('error', error.message);
      return res.redirect('/admin/dashboard');
    }
    return next(error);
  }
});

module.exports = router;
