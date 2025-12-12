// routes/points.js
const express = require('express');
const router = express.Router();
const pointsController = require('../controllers/pointsController');

// ici tu peux aussi protéger par un middleware ensureLoggedIn/ensureCitoyen si tu en as un

// Page pour utiliser les points
router.get('/points/utiliser', pointsController.showUsePointsForm);

// Traitement du formulaire
router.post('/points/utiliser', pointsController.usePoints);

module.exports = router;
