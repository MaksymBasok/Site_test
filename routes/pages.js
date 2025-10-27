const express = require('express');
const createError = require('http-errors');
const { getActiveGoal, getTotals, listBankAccounts } = require('../services/fundraisingService');
const donationService = require('../services/donationService');
const volunteerService = require('../services/volunteerService');
const { listVehicles } = require('../services/vehicleService');
const { listMedia, listDocuments } = require('../services/contentService');

const router = express.Router();

router.get('/', (req, res) => {
  const goal = getActiveGoal();
  const totals = getTotals();
  const bankAccounts = listBankAccounts();
  const donations = donationService.listPublicDonations(6);
  const vehicles = listVehicles();

  res.render('home', {
    title: 'Фонд "Волонтерка"',
    goal,
    totals,
    bankAccounts,
    donations,
    vehicles
  });
});

router.get('/donations', (req, res) => {
  const goal = getActiveGoal();
  const totals = getTotals();
  const bankAccounts = listBankAccounts();
  const donations = donationService.listPublicDonations(20);

  res.render('donations', {
    title: 'Як підтримати фонд',
    goal,
    totals,
    bankAccounts,
    donations
  });
});

router.post('/donations', donationService.donationValidators, (req, res, next) => {
  try {
    donationService.validate(req);
    donationService.createDonation({
      donor_name: req.body.donor_name,
      amount: Number(req.body.amount),
      currency: 'UAH',
      message: req.body.message,
      public: req.body.public === 'on'
    });
    req.flash('success', 'Дякуємо! Запис про донат збережено.');
    res.redirect('/donations');
  } catch (error) {
    if (error.status === 422) {
      req.flash('error', error.message);
      return res.redirect('/donations');
    }
    return next(error);
  }
});

router.get('/cars', (req, res) => {
  const vehicles = listVehicles();
  res.render('cars', {
    title: 'Автопарк та потреби',
    vehicles
  });
});

router.get('/volunteers', (req, res) => {
  const volunteers = volunteerService.listRecent(10);
  res.render('volunteers', {
    title: 'Долучитися як волонтер',
    volunteers
  });
});

router.post('/volunteers', volunteerService.volunteerValidators, (req, res, next) => {
  try {
    volunteerService.validate(req);
    volunteerService.createVolunteer(req.body);
    req.flash('success', 'Анкету прийнято. Ми з вами зв\'яжемося.');
    res.redirect('/volunteers');
  } catch (error) {
    if (error.status === 422) {
      req.flash('error', error.message);
      return res.redirect('/volunteers');
    }
    return next(error);
  }
});

router.get('/documents', (req, res) => {
  const media = listMedia();
  const documents = listDocuments();
  res.render('documents', {
    title: 'Документи та прозорість',
    media,
    documents
  });
});

router.get('/contacts', (req, res) => {
  res.render('contacts', {
    title: 'Контакти'
  });
});

router.get('/about', (req, res) => {
  res.render('about', {
    title: 'Про фонд'
  });
});

router.use((req, res, next) => {
  next(createError(404));
});

module.exports = router;
