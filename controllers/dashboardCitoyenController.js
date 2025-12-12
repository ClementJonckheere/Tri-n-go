// controllers/dashboardCitoyenController.js
const User = require('../models/users');
const Signalement = require('../models/signalements');
const { getCashbackRate } = require('../config/points');

exports.showDashboardCitoyen = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user._id) {
            return res.redirect('/login');
        }

        const userId = req.session.user._id;

        // 1. Récup user + points
        const user = await User.findById(userId).lean();
        const pointsTotal = user?.pointsTotal || 0;
        const rate = getCashbackRate(pointsTotal);
        const maxEuros = pointsTotal * rate;

        // 2. Calcul palier (on peut réutiliser ta logique existante)
        const PALIER = 100;
        const nextPalier = ((Math.floor(pointsTotal / PALIER) + 1) * PALIER);
        const previousPalier = nextPalier - PALIER;
        const progression = Math.max(
            0,
            Math.min(100, ((pointsTotal - previousPalier) / PALIER) * 100)
        );

        // 3. Derniers signalements
        const recentSignalements = await Signalement
            .find({ citoyen: userId })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        res.render('dashboard/dashboard-citoyen.twig', {
            recentSignalements,
            pointsTotal,
            rate,
            maxEuros,
            nextPalier,
            progression,
            decheterieAccountNumber: user.decheterieAccountNumber || '',
            error: null,
            success: null,
        });
    } catch (err) {
        console.error('Erreur showDashboardCitoyen :', err);
        res.status(500).render('error.twig', {
            title: 'Erreur',
            message: 'Erreur lors du chargement du tableau de bord citoyen.',
        });
    }
};
