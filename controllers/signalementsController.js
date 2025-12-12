const Signalement= require('../models/signalements');
const User = require('../models/users');
const {
    POINTS_BASE_VALIDATION,
    BONUS_COMPLETUDE,
    BONUS_REGULARITE,
    BONUS_ZONE_PRIORITAIRE,
    REGULARITE_JOURS,
    getCashbackRate,
} = require('../config/points');

// Formulaire
exports.showCreateForm = async (req, res) => {
    try {
        let currentUser = null;

        if (req.session.user && req.session.user._id) {
            currentUser = await User.findById(req.session.user._id).lean();
        }

        res.render('signalements/new.twig', {
            title: 'Nouveau signalement',
            currentUser,
        });
    } catch (err) {
        console.error('Erreur showCreateForm :', err);
        res.status(500).render('error.twig', {
            title: 'Erreur',
            message: 'Erreur lors de l’affichage du formulaire.',
        });
    }
};


exports.createSignalement = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user._id) {
            return res.redirect('/login');
        }

        const { description, typeEncombrant, ville, codePostal, adresse } = req.body;

        const newSignalement = new Signalement({
            description,
            typeEncombrant,
            ville,
            codePostal,
            adresse,
            photoFilename: req.file ? req.file.filename : null,
            citoyen: req.session.user._id,
            statut: 'signale',
            dateSignalement: new Date(),
        });

        // premier historique = création
        newSignalement.historiqueStatuts.push({
            from: null,
            to: 'signale',
            changedAt: new Date(),
            changedBy: req.session.user._id,
        });

        await newSignalement.save();

        res.redirect('/signalements');
    } catch (err) {
        console.error(err);
        res.status(500).render('error.twig', {
            title: 'Erreur',
            message: 'Erreur lors de la création du signalement',
        });
    }
};


// Liste des signalements du citoyen
exports.listSignalementsCitoyen = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId).lean();
        const signalements = await Signalement.find({ citoyen: userId })
            .sort({ dateSignalement: -1 });

        const pointsTotal = user?.pointsTotal || 0;

        // Palier de progression déjà existant
        const PALIER = 100;
        const nextPalier = ((Math.floor(pointsTotal / PALIER) + 1) * PALIER);
        const previousPalier = nextPalier - PALIER;
        const progression = Math.max(
            0,
            Math.min(100, ((pointsTotal - previousPalier) / PALIER) * 100),
        );

        // --- NOUVEAU : cashback ---
        const cashbackRate = getCashbackRate(pointsTotal);   // ex : 0.07
        const cashbackValue = pointsTotal * cashbackRate;    // en €

        res.render('signalements/list.twig', {
            title: 'Mes signalements',
            signalements,
            pointsTotal,
            nextPalier,
            progression,
            cashbackRate,
            cashbackValue,
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error.twig', {
            title: 'Erreur',
            message: 'Erreur lors de la récupération de vos signalements',
        });
    }
};

// Gestion des signalements
exports.listGestion = async (req, res) => {
    try {
        const currentUser = req.session.user;
        if (!currentUser) {
            return res.redirect('/login');
        }

        let filter = {};
        let villes = [];
        let currentVilleFilter = '';

        // Gestionnaire : accès à tout + filtre ville
        if (currentUser.role === 'gestionnaire') {
            const ville = (req.query.ville || '').trim();
            if (ville) {
                filter.ville = ville;
                currentVilleFilter = ville;
            }
            villes = await Signalement.distinct('ville');
        }

        if (currentUser.role === 'agent' || currentUser.role === 'chef_agent') {
            if (currentUser.perimetreVille) {
                filter.ville = currentUser.perimetreVille;
                currentVilleFilter = currentUser.perimetreVille;
            } else {
                filter._id = null;
            }
        }

        const signalements = await Signalement
            .find(filter)
            .sort({ dateSignalement: -1 })
            .populate('citoyen');

        res.render('signalements/gestion.twig', {
            title: 'Gestion des signalements',
            signalements,
            villes,
            currentVilleFilter,
        });
    } catch (err) {
        console.error('Erreur listGestion :', err);
        res.status(500).render('error.twig', {
            title: 'Erreur',
            message: 'Erreur lors de la récupération des signalements (gestion).',
        });
    }
};

// POST statut
exports.updateStatut = async (req, res) => {
    try {
        const signalementId = req.params.id;
        const nouveauStatut = req.body.statut;
        const signalement = await Signalement.findById(signalementId).populate('citoyen');

        if (!signalement) {
            return res.status(404).render('error.twig', {
                title: 'Erreur',
                message: 'Signalement introuvable.',
            });
        }

        const ancienStatut = signalement.statut;
        signalement.statut = nouveauStatut;

        let pointsGagnes = 0;

        if (
            nouveauStatut === 'valide' &&
            ancienStatut !== 'valide' &&
            !signalement.pointsCredites &&
            signalement.citoyen
        ) {
            const dateLimite = new Date();
            dateLimite.setDate(dateLimite.getDate() - REGULARITE_JOURS);

            const nbValidesRecent = await Signalement.countDocuments({
                citoyen: signalement.citoyen._id,
                statut: 'valide',
                pointsCredites: true,
                updatedAt: { $gte: dateLimite },
                _id: { $ne: signalement._id },
            });

            pointsGagnes = computePoints(signalement, nbValidesRecent, signalement.citoyen);

            const citoyen = signalement.citoyen;
            citoyen.pointsTotal = (citoyen.pointsTotal || 0) + pointsGagnes;
            await citoyen.save();

            signalement.pointsAttribues = pointsGagnes;
            signalement.pointsCredites = true;
        }

        await signalement.save();
        const redirectUrl = req.header('Referer') || '/signalements/gestion';
        res.redirect(redirectUrl);
    } catch (err) {
        console.error('Erreur updateStatut :', err);
        res.status(500).render('error.twig', {
            title: 'Erreur',
            message: 'Erreur lors de la mise à jour du statut.',
        });
    }
};

exports.detailCitoyen = async (req, res) => {
    try {
        const citoyenId = req.params.id;

        const user = await User.findById(citoyenId).lean();
        if (!user) {
            return res.status(404).render('error.twig', {
                title: 'Citoyen introuvable',
                message: 'Ce citoyen n’existe pas.',
            });
        }

        const signalements = await Signalement.find({ citoyen: citoyenId })
            .sort({ dateSignalement: -1 })
            .populate('historiqueStatuts.changedBy')
            .lean();

        const nbSignalements = signalements.length;
        const lastSignalementDate = nbSignalements > 0 ? signalements[0].dateSignalement : null;

        res.render('signalements/citoyen-detail.twig', {
            title: 'Fiche citoyen',
            citoyen: user,
            signalements,
            nbSignalements,
            lastSignalementDate,
        });
    } catch (err) {
        console.error('Erreur detailCitoyen :', err);
        res.status(500).render('error.twig', {
            title: 'Erreur',
            message: 'Erreur lors du chargement de la fiche citoyen',
        });
    }
};


function computePoints(signalement, nbValidesRecent, citoyen) {
    let points = POINTS_BASE_VALIDATION;
    const hasPhoto = !!signalement.photoPath;
    const hasDescription = !!signalement.description && signalement.description.trim().length > 0;
    const hasType = !!signalement.typeEncombrant;

    if (hasPhoto && hasDescription && hasType) {
        points += BONUS_COMPLETUDE;
    }
    if (nbValidesRecent >= 3) {
        points += BONUS_REGULARITE;
    }
    if (citoyen && citoyen.perimetreVille && signalement.ville) {
        const villeSignalement = signalement.ville.trim().toLowerCase();
        const villePerimetre = citoyen.perimetreVille.trim().toLowerCase();
        if (villeSignalement === villePerimetre) {
            points += BONUS_ZONE_PRIORITAIRE;
        }
    }
    return points;
}


// --- Géocodage d'adresse via l'API GeoPlateforme --------------------
// Utilise fetch natif de Node (>= 18). Si tu es sur une version plus
// ancienne, installe "node-fetch" et adapte.
exports.geocodeAdresse = async (req, res) => {
    try {
        const { adresse, ville, codePostal } = req.query;

        if (!adresse && !ville && !codePostal) {
            return res.status(400).json({
                error: 'Adresse, ville ou code postal requis.',
            });
        }

        // On construit une chaîne de recherche
        const parts = [];
        if (adresse) parts.push(adresse);
        if (codePostal) parts.push(codePostal);
        if (ville) parts.push(ville);
        const q = parts.join(' ');

        // URL de l’API IGN (GeoPlateforme)
        const baseUrl = process.env.GEO_API_URL || 'https://data.geopf.fr/geocodage/search';
        const apiKey = process.env.GEO_API_KEY; // à définir dans ton .env ou variables d'environnement

        const url = new URL(baseUrl);
        url.searchParams.set('q', q);
        url.searchParams.set('limit', '1');
        if (apiKey) {
            url.searchParams.set('apiKey', apiKey);
        }

        const resp = await fetch(url.toString(), {
            headers: { Accept: 'application/json' },
        });

        if (!resp.ok) {
            console.error('[geocodeAdresse] Statut non OK :', resp.status);
            return res.status(502).json({
                error: 'Erreur du service de géocodage.',
            });
        }

        const data = await resp.json();

        if (!data || !Array.isArray(data.features) || data.features.length === 0) {
            return res.status(404).json({
                error: 'Aucun résultat pour cette adresse.',
            });
        }

        const feature = data.features[0];
        const coords = feature.geometry && feature.geometry.coordinates
            ? feature.geometry.coordinates
            : [null, null];
        const [lon, lat] = coords;
        const props = feature.properties || {};

        // On renvoie uniquement ce dont on a besoin au front
        return res.json({
            lat,
            lon,
            label: props.label || null,
            city: props.city || props.commune || null,
            postcode: props.postcode || props.codePostal || null,
            score: props.score || null,
        });
    } catch (err) {
        console.error('Erreur geocodeAdresse :', err);
        return res.status(500).json({
            error: 'Erreur serveur lors du géocodage.',
        });
    }
};


