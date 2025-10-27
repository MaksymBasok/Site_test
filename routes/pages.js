const express = require('express');
const createError = require('http-errors');
const { getActiveGoal, getTotals, listBankAccounts, listWithdrawals } = require('../services/fundraisingService');
const donationService = require('../services/donationService');
const volunteerService = require('../services/volunteerService');
const { listVehicles } = require('../services/vehicleService');
const {
  listMedia,
  listDocuments,
  listArticles,
  getContentBlock
} = require('../services/contentService');
const reviewService = require('../services/reviewService');
const feedbackService = require('../services/feedbackService');
const { requireApprovedUser } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const goal = getActiveGoal();
  const totals = getTotals();
  const bankAccounts = listBankAccounts();
  const donations = donationService.listPublicDonations(6);
  const vehicles = listVehicles();
  const reviews = reviewService.listPublic(6);
  const articles = listArticles().slice(0, 3);
  const reviewIntro = getContentBlock('home_reviews_intro');

  res.render('home', {
    title: 'Фонд "Волонтерка"',
    goal,
    totals,
    bankAccounts,
    donations,
    vehicles,
    reviews,
    articles,
    reviewIntro
  });
});

router.get('/donations', (req, res) => {
  const goal = getActiveGoal();
  const totals = getTotals();
  const bankAccounts = listBankAccounts();
  const donations = donationService.listPublicDonations(20);
  const withdrawals = listWithdrawals(20);
  const reviews = reviewService.listPublic(12);

  res.render('donations', {
    title: 'Як підтримати фонд',
    goal,
    totals,
    bankAccounts,
    donations,
    withdrawals,
    reviews
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
  const feedback = feedbackService.listRecent(10);
  const coordinator = getContentBlock('volunteer_contacts');
  res.render('volunteers', {
    title: 'Долучитися як волонтер',
    volunteers,
    feedback,
    coordinator
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
  const coordinator = getContentBlock('volunteer_contacts');
  res.render('contacts', {
    title: 'Контакти',
    coordinator
  });
});

router.get('/about', (req, res) => {
  res.render('about', {
    title: 'Про фонд'
  });
});

router.get('/live', requireApprovedUser, (req, res) => {
  const liveInfo = getContentBlock('live_stream_info');
  res.render('live', {
    title: 'Прямий ефір',
    liveInfo
  });
});

router.post('/reviews', reviewService.reviewValidators, (req, res, next) => {
  try {
    reviewService.validate(req);
    reviewService.createReview({
      author_name: req.body.author_name,
      rating: req.body.rating ? Number(req.body.rating) : null,
      message: req.body.message,
      public: false
    });
    req.flash('success', 'Дякуємо! Відгук передано на модерацію.');
    res.redirect('/donations');
  } catch (error) {
    if (error.status === 422) {
      req.flash('error', error.message);
      return res.redirect('/donations');
    }
    return next(error);
  }
});

router.post('/feedback', feedbackService.feedbackValidators, (req, res, next) => {
  try {
    feedbackService.validate(req);
    feedbackService.createFeedback({
      sender_name: req.body.sender_name,
      contact: req.body.contact,
      message: req.body.message,
      channel: req.body.channel
    });
    req.flash('success', 'Дякуємо! Ми зв\'яжемось із вами найближчим часом.');
    res.redirect('/volunteers');
  } catch (error) {
    if (error.status === 422) {
      req.flash('error', error.message);
      return res.redirect('/volunteers');
    }
    return next(error);
  }
});

router.get('/articles', (req, res) => {
  const articles = listArticles();
  res.render('articles', {
    title: 'Новини та звіти',
    articles
  });
});

router.get('/articles/:id', (req, res, next) => {
  const article = listArticles().find((item) => item.id === Number(req.params.id));
  if (!article) {
    return next(createError(404));
  }
  res.render('article', {
    title: article.title,
    article
  });
});

router.use((req, res, next) => {
  next(createError(404));
});

module.exports = router;
