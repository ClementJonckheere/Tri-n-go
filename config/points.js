// config/points.js

// Points & bonus
const POINTS_INSCRIPTION = 20;
const POINTS_BASE_VALIDATION = 10;
const BONUS_COMPLETUDE = 3;
const BONUS_REGULARITE = 5;
const BONUS_ZONE_PRIORITAIRE = 5;
const REGULARITE_JOURS = 30;

// Paliers de cashback
const CASHBACK_PALIERS = [
    { min: 0,   rate: 0.05 },
    { min: 100, rate: 0.06 },
    { min: 200, rate: 0.07 },
    { min: 300, rate: 0.08 },
    { min: 400, rate: 0.09 },
    { min: 500, rate: 0.10 },
];

function getCashbackRate(points) {
    const paliers = CASHBACK_PALIERS;

    // sécurité au cas où
    if (!Array.isArray(paliers) || paliers.length === 0) {
        return 0.05;
    }

    let rate = paliers[0].rate;
    for (const palier of paliers) {
        if (points >= palier.min) {
            rate = palier.rate;
        }
    }
    return rate;
}

module.exports = {
    POINTS_INSCRIPTION,
    POINTS_BASE_VALIDATION,
    BONUS_COMPLETUDE,
    BONUS_REGULARITE,
    BONUS_ZONE_PRIORITAIRE,
    REGULARITE_JOURS,
    CASHBACK_PALIERS,
    getCashbackRate,
};
