const express = require('express');
const { getActiveGoal, getTotals, listBankAccounts } = require('../services/fundraisingService');
const donationService = require('../services/donationService');
const { listVehicles } = require('../services/vehicleService');
const { listMedia, listDocuments } = require('../services/contentService');

const router = express.Router();

router.get('/summary', (req, res) => {
  res.json({
    goal: getActiveGoal(),
    totals: getTotals(),
    bankAccounts: listBankAccounts()
  });
});

router.get('/donations', (req, res) => {
  const limit = Number(req.query.limit) || 20;
  res.json({ donations: donationService.listPublicDonations(limit) });
});

router.get('/vehicles', (req, res) => {
  res.json({ vehicles: listVehicles() });
});

router.get('/media', (req, res) => {
  res.json({ media: listMedia() });
});

router.get('/documents', (req, res) => {
  res.json({ documents: listDocuments() });
});

module.exports = router;
