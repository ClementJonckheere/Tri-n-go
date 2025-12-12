// controllers/homeController.js
const Signalement = require('../models/signalements');
const User = require('../models/users');
const statsController = require('./statsController');

// controllers/homeController.js
exports.home = async (req, res, next) => {
  const sessionUser = req.session.user;

  // 1) PAS CONNECTÉ : on affiche la landing page publique
  if (!sessionUser) {
    // 👇 on remet le bon chemin dossier/fichier
    return res.render('stats/home-citoyen.twig');
  }

  // 2) CONNECTÉ CITOYEN : on l’envoie vers son dashboard
  if (sessionUser.role === 'citoyen') {
    return res.redirect('/dashboard-citoyen');
  }

  // 3) AUTRES RÔLES : dashboard stats
  return statsController.dashboard(req, res, next);
};
