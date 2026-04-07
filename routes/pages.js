// routes/pages.js
const express = require('express');
const router = express.Router();
const pagesController = require('../controllers/pagesController');

// Pages légales
router.get('/cgu', pagesController.cgu);
router.get('/politique-confidentialite', pagesController.confidentialite);

// Contact
router.get('/contact', pagesController.showContact);
router.post('/contact', pagesController.submitContact);

// FAQ
router.get('/faq', pagesController.faq);

module.exports = router;