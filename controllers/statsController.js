const Signalement = require('../models/signalements');
const User = require('../models/users');

exports.dashboard = async (req, res) => {
    try {
        const sessionUser = req.session.user;
        if (!sessionUser || sessionUser.role === 'citoyen') {
            return res.status(403).render('error.twig', {
                title: 'Accès refusé',
                message: 'Vous n’avez pas accès au dashboard.',
            });
        }

        let perimetreVille = null;
        let allowPerimetreFilter = false;
        let perimetres = [];

        // Gestionnaire : filtre ville
        if (sessionUser.role === 'gestionnaire') {
            allowPerimetreFilter = true;
            perimetreVille = (req.query.perimetreVille || '').trim() || null;

            perimetres = await User.distinct('perimetreVille', { role: 'citoyen' });
            perimetres = perimetres.filter(Boolean).sort();
        } else {
            // Agent : périmètre ville
            perimetreVille = sessionUser.perimetreVille || null;
        }

        const sigFilter = {};
        if (perimetreVille) {
            sigFilter.ville = perimetreVille;
        }

        // Volume
        const volumeParMoisAgg = await Signalement.aggregate([
            { $match: sigFilter },
            {
                $addFields: {
                    dref: { $ifNull: ['$dateSignalement', '$createdAt'] },
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$dref' },
                        month: { $month: '$dref' },
                    },
                    total: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        const volumeParMois = volumeParMoisAgg.map((r) => {
            const y = r._id.year;
            const m = String(r._id.month).padStart(2, '0');
            return { periode: `${y}-${m}`, total: r.total };
        });

        // Répartition par type d’encombrant
        const repartitionTypesAgg = await Signalement.aggregate([
            { $match: sigFilter },
            {
                $group: {
                    _id: { $ifNull: ['$typeEncombrant', 'inconnu'] },
                    total: { $sum: 1 },
                },
            },
            { $sort: { total: -1 } },
        ]);

        const repartitionTypes = repartitionTypesAgg.map((r) => ({
            type: r._id,
            total: r.total,
        }));

        // Classement des clients
        const pointsParCitoyenAgg = await Signalement.aggregate([
            { $match: sigFilter },
            {
                $group: {
                    _id: '$citoyen',
                    points: { $sum: { $ifNull: ['$pointsAttribues', 0] } },
                },
            },
            { $match: { points: { $gt: 0 } } },
            { $sort: { points: -1 } },
            { $limit: 10 },
        ]);

        const citoyenIds = pointsParCitoyenAgg.map((r) => r._id).filter(Boolean);
        const citoyensDocs = await User.find({ _id: { $in: citoyenIds } }).lean();
        const citoyensById = {};
        citoyensDocs.forEach((c) => {
            citoyensById[c._id.toString()] = c;
        });

        const classementCitoyens = pointsParCitoyenAgg.map((r) => {
            const c = citoyensById[r._id?.toString()] || {};
            return {
                citoyenId: r._id,
                name: c.name || 'Citoyen ' + String(r._id).slice(-6),
                email: c.email || '',
                points: r.points,
            };
        });

        // Les traitements par agent
        const matchEtHistorique = [
            { $match: sigFilter },
            { $unwind: '$historiqueStatuts' },
            {
                $match: {
                    'historiqueStatuts.to': 'valide',
                    'historiqueStatuts.changedBy': { $ne: null },
                },
            },
        ];

        const volumeParAgentAgg = await Signalement.aggregate([
            ...matchEtHistorique,
            {
                $group: {
                    _id: '$historiqueStatuts.changedBy',
                    totalValides: { $sum: 1 },
                },
            },
            { $sort: { totalValides: -1 } },
        ]);

        const agentIds = volumeParAgentAgg.map((r) => r._id).filter(Boolean);
        const agentsDocs = await User.find({ _id: { $in: agentIds } }).lean();
        const agentsById = {};
        agentsDocs.forEach((a) => {
            agentsById[a._id.toString()] = a;
        });

        const volumeParAgent = volumeParAgentAgg.map((r) => {
            const a = agentsById[r._id?.toString()] || {};
            return {
                agentId: r._id,
                name: a.name || 'Agent ' + String(r._id).slice(-6),
                role: a.role || '',
                perimetreVille: a.perimetreVille || '',
                totalValides: r.totalValides,
            };
        });

        // KPI
        const [totalSignalements, totalValides, totalCitoyens] = await Promise.all([
            Signalement.countDocuments(sigFilter),
            Signalement.countDocuments({ ...sigFilter, statut: 'valide' }),
            User.countDocuments({
                role: 'citoyen',
                ...(perimetreVille ? { perimetreVille } : {}),
            }),
        ]);

        res.render('stats/dashboard.twig', {
            title: 'Dashboard statistiques',
            volumeParMois,
            repartitionTypes,
            classementCitoyens,
            volumeParAgent,
            kpi: {
                totalSignalements,
                totalValides,
                totalCitoyens,
            },
            perimetreVille,
            perimetres,
            allowPerimetreFilter,
        });
    } catch (err) {
        console.error('Erreur dashboard stats :', err);
        res.status(500).render('error.twig', {
            title: 'Erreur',
            message: 'Erreur lors du calcul des statistiques.',
        });
    }
};
