// routes/citoyen.js
const express = require('express');
const router = express.Router();

const dashboardCitoyenController = require('../controllers/dashboardCitoyenController');
const pointsController = require('../controllers/pointsController');
const signalementsController = require('../controllers/signalementsController');
// + autres controllers si besoin

// ➜ Tableau de bord citoyen
router.get('/dashboard-citoyen', dashboardCitoyenController.showDashboardCitoyen);

// ➜ Utilisation des points (dans le dashboard)
router.post('/points/utiliser', pointsController.usePoints);

// Si quelqu’un fait GET /points/utiliser, on le renvoie vers la section #points
router.get('/points/utiliser', (req, res) => {
    return res.redirect('/dashboard-citoyen#points');
});

// ➜ TES AUTRES ROUTES CITOYEN EXISTANTES
router.get('/signalements', signalementsController.listSignalementsCitoyen);
router.get('/signalements/nouveau', signalementsController.showCreateForm);
// etc.

module.exports = router;
