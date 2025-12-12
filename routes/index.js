// routes/index.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

const homeController = require('../controllers/homeController');

// Page d’accueil PUBLIQUE
router.get('/', homeController.home);

module.exports = router;
