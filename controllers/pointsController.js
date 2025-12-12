const User = require('../models/users');
const { getCashbackRate } = require('../config/points');
getCashbackRate(120);

// GET /points/utiliser
exports.showUsePointsForm = async (req, res) => {
    if (!req.session.user || !req.session.user._id) {
        return res.redirect('/login');
    }

    const user = await User.findById(req.session.user._id).lean();
    if (!user) return res.redirect('/login');

    const pointsTotal = user.pointsTotal || 0;
    const rate = getCashbackRate(pointsTotal);
    const maxEuros = pointsTotal * rate;

    res.render('points/use.twig', {
        title: 'Utiliser mes points',
        pointsTotal,
        rate,
        maxEuros,
        decheterieAccountNumber: user.decheterieAccountNumber || '',
        error: null,
        success: null,
    });
};


// POST /points/utiliser
// POST /points/utiliser
exports.usePoints = async (req, res) => {
    if (!req.session.user || !req.session.user._id) {
        return res.redirect('/login');
    }

    const user = await User.findById(req.session.user._id);
    if (!user) return res.redirect('/login');

    const pointsTotal = user.pointsTotal || 0;
    const rate = getCashbackRate(pointsTotal);
    const maxEuros = pointsTotal * rate;

    let pointsToUse = parseInt(req.body.pointsToUse, 10);
    const decheterieAccountNumber = (req.body.decheterieAccountNumber || '').trim();
    const saveAccount = req.body.saveAccount === 'on';

    if (!Number.isFinite(pointsToUse) || pointsToUse <= 0) {
        return res.render('points/use.twig', {
            title: 'Utiliser mes points',
            pointsTotal,
            rate,
            maxEuros,
            decheterieAccountNumber: user.decheterieAccountNumber || '',
            error: 'Veuillez saisir un nombre de points valide.',
            success: null,
        });
    }

    if (!decheterieAccountNumber) {
        return res.render('points/use.twig', {
            title: 'Utiliser mes points',
            pointsTotal,
            rate,
            maxEuros,
            decheterieAccountNumber: user.decheterieAccountNumber || '',
            error: 'Veuillez saisir votre numéro de compte déchèterie.',
            success: null,
        });
    }

    if (pointsToUse > pointsTotal) {
        pointsToUse = pointsTotal;
    }

    const euros = pointsToUse * rate;

    // Décrément des points
    user.pointsTotal = pointsTotal - pointsToUse;
    user.cashbackUsedTotal = (user.cashbackUsedTotal || 0) + euros;

    // Mémoriser le compte déchèterie pour la suite
    if (saveAccount) {
        user.decheterieAccountNumber = decheterieAccountNumber;
    }

    await user.save();

    return res.render('points/use-confirmation.twig', {
        title: 'Points utilisés',
        pointsUsed: pointsToUse,
        euros,
        decheterieAccountNumber,
    });
};
