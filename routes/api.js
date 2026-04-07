const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/users');
const Signalement = require('../models/signalements');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = '7d';

function apiAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ ok: false, message: 'Missing token' });

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.apiUser = payload; // { id, role }
        next();
    } catch (e) {
        return res.status(401).json({ ok: false, message: 'Invalid token' });
    }
}

function requireApiRole(...roles) {
    return (req, res, next) => {
        if (!req.apiUser) return res.status(401).json({ ok: false, message: 'Unauthorized' });
        if (!roles.includes(req.apiUser.role)) return res.status(403).json({ ok: false, message: 'Forbidden' });
        next();
    };
}

router.post('/auth/login', async (req, res) => {
    const { email = '', password = '' } = req.body || {};
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ ok: false, message: 'Bad credentials' });
    if (!user.isActive) return res.status(403).json({ ok: false, message: 'User disabled' });

    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(401).json({ ok: false, message: 'Bad credentials' });

    const token = jwt.sign({ id: user._id.toString(), role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.json({
        ok: true,
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, perimetreVille: user.perimetreVille || null }
    });
});

router.post('/auth/register', async (req, res) => {
    const { name, email, password, adresse, ville, codePostal } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ ok: false, message: 'Missing fields' });

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ ok: false, message: 'Email already used' });

    const user = new User({ name, email: email.toLowerCase().trim(), role: 'citoyen', adresse, ville, codePostal });
    await user.setPassword(password);
    await user.save();

    return res.status(201).json({ ok: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

router.get('/auth/me', apiAuth, async (req, res) => {
    const user = await User.findById(req.apiUser.id).select('name email role pointsTotal ville codePostal perimetreVille cashbackUsedTotal decheterieAccountNumber');
    return res.json({ ok: true, user });
});
router.get('/signalements', apiAuth, requireApiRole('citoyen', 'agent', 'chef_agent', 'gestionnaire'), async (req, res) => {
    try {
        const q = {};
        
        const user = await User.findById(req.apiUser.id).lean();
        if (!user) {
            return res.status(404).json({ ok: false, message: 'Utilisateur non trouvé' });
        }

        if (req.apiUser.role === 'citoyen') {
            q.citoyen = req.apiUser.id;
        } else if (req.apiUser.role === 'agent' || req.apiUser.role === 'chef_agent') {
            if (user.perimetreVille) {
                q.ville = user.perimetreVille;
            }
            else {
                return res.json({ ok: true, items: [], message: 'Aucun périmètre défini' });
            }
        }

        const items = await Signalement.find(q)
            .sort({ dateSignalement: -1 })
            .limit(500)
            .populate('citoyen', 'name email ville pointsTotal')
            .lean();

        return res.json({ ok: true, items });
    } catch (err) {
        console.error('Erreur GET /signalements:', err);
        return res.status(500).json({ ok: false, message: 'Erreur serveur' });
    }
});

const fs = require('fs');
const path = require('path');

router.post('/signalements', apiAuth, requireApiRole('citoyen'), async (req, res) => {
    try {
        const { description, typeEncombrant, adresse, ville, codePostal, lat, lon, photo } = req.body || {};

        console.log('NOUVEAU SIGNALEMENT');
        console.log('description:', description);
        console.log('typeEncombrant:', typeEncombrant);
        console.log('adresse:', adresse);
        console.log('ville:', ville);
        console.log('codePostal:', codePostal);
        console.log('lat:', lat);
        console.log('lon:', lon);
        console.log('photo reçue:', photo ? `OUI (${photo.length} caractères, commence par: ${photo.substring(0, 50)}...)` : 'NON');

        if (!description || !typeEncombrant || !adresse || !ville || !codePostal) {
            console.log('ERREUR: Champs manquants');
            return res.status(400).json({ ok: false, message: 'Missing fields' });
        }

        let photoFilename = null;

        if (photo && typeof photo === 'string' && photo.startsWith('data:image')) {
            console.log('Photo détectée, tentative de sauvegarde...');
            try {
                const matches = photo.match(/^data:image\/(\w+);base64,(.+)$/);
                console.log('Regex matches:', matches ? 'OUI' : 'NON');

                if (matches) {
                    const ext = matches[1]; 
                    const base64Data = matches[2];
                    const buffer = Buffer.from(base64Data, 'base64');

                    console.log('[API DEBUG] Extension:', ext);
                    console.log('[API DEBUG] Taille buffer:', buffer.length, 'bytes');

                    photoFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`;

                    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
                    console.log('[API DEBUG] Dossier uploads:', uploadsDir);

                    if (!fs.existsSync(uploadsDir)) {
                        console.log('[API DEBUG] Création du dossier uploads...');
                        fs.mkdirSync(uploadsDir, { recursive: true });
                    }

                    const filePath = path.join(uploadsDir, photoFilename);
                    fs.writeFileSync(filePath, buffer);

                    console.log('Photo sauvegardée:', filePath);
                } else {
                    console.log('Format photo invalide');
                }
            } catch (photoErr) {
                console.error('Erreur sauvegarde photo:', photoErr);
            }
        } else {
            console.log('[API DEBUG] Pas de photo ou format incorrect');
            if (photo) {
                console.log('[API DEBUG] Type de photo:', typeof photo);
                console.log('[API DEBUG] Début de photo:', photo.substring(0, 100));
            }
        }

        const s = new Signalement({
            description,
            typeEncombrant,
            adresse,
            ville,
            codePostal,
            lat: lat || null,
            lon: lon || null,
            photoFilename,
            citoyen: req.apiUser.id,
            statut: 'signale',
            dateSignalement: new Date(),
            historiqueStatuts: [{ from: null, to: 'signale', changedBy: req.apiUser.id, changedAt: new Date() }]
        });

        await s.save();

        console.log('Signalement créé, photoFilename:', photoFilename);

        return res.status(201).json({ ok: true, item: s });
    } catch (err) {
        console.error('Erreur générale:', err);
        return res.status(500).json({ ok: false, message: 'Erreur serveur' });
    }
});
router.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

router.patch('/admin/signalements/:id/statut', apiAuth, requireApiRole('agent', 'chef_agent', 'gestionnaire'), async (req, res) => {
    const { statut } = req.body || {};
    if (!statut) return res.status(400).json({ ok: false, message: 'Missing statut' });

    const s = await Signalement.findById(req.params.id);
    if (!s) return res.status(404).json({ ok: false, message: 'Not found' });

    const from = s.statut;
    s.statut = statut;

    s.historiqueStatuts.push({
        from,
        to: statut,
        changedBy: req.apiUser.id,
        changedAt: new Date(),
    });

    await s.save();
    return res.json({ ok: true, item: s });
});

router.put('/profile', apiAuth, async (req, res) => {
    try {
        const { name, adresse, ville, codePostal } = req.body || {};
        
        const user = await User.findById(req.apiUser.id);
        if (!user) {
            return res.status(404).json({ ok: false, message: 'Utilisateur non trouvé' });
        }

        if (name !== undefined && name.trim()) {
            user.name = name.trim();
        }
        if (adresse !== undefined) {
            user.adresse = adresse ? adresse.trim() : null;
        }
        if (ville !== undefined) {
            user.ville = ville ? ville.trim() : null;
            if (user.role === 'citoyen') {
                user.perimetreVille = ville ? ville.trim() : null;
            }
        }
        if (codePostal !== undefined) {
            user.codePostal = codePostal ? codePostal.trim() : null;
        }

        await user.save();

        return res.json({
            ok: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                adresse: user.adresse,
                ville: user.ville,
                codePostal: user.codePostal,
                perimetreVille: user.perimetreVille,
                pointsTotal: user.pointsTotal || 0,
                cashbackUsedTotal: user.cashbackUsedTotal || 0,
                decheterieAccountNumber: user.decheterieAccountNumber,
            }
        });
    } catch (err) {
        console.error('Erreur PUT /profile:', err);
        return res.status(500).json({ ok: false, message: 'Erreur serveur' });
    }
});

router.get('/users', apiAuth, requireApiRole('gestionnaire'), async (req, res) => {
    try {
        const { role, search, ville } = req.query;

        const filter = {};

        if (role && ['citoyen', 'agent', 'chef_agent', 'gestionnaire'].includes(role)) {
            filter.role = role;
        }

        if (ville) {
            filter.$or = [
                { ville: ville },
                { perimetreVille: ville }
            ];
        }

        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            filter.$or = filter.$or || [];
            filter.$or.push(
                { name: searchRegex },
                { email: searchRegex }
            );
        }

        const users = await User.find(filter)
            .select('name email role ville codePostal perimetreVille pointsTotal isActive createdAt')
            .sort({ name: 1 })
            .limit(200)
            .lean();

        const perimetres = await User.distinct('perimetreVille');
        const villesClean = perimetres.filter(Boolean).sort();

        return res.json({
            ok: true,
            items: users,
            total: users.length,
            perimetres: villesClean
        });
    } catch (err) {
        console.error('Erreur GET /users:', err);
        return res.status(500).json({ ok: false, message: 'Erreur serveur' });
    }
});

router.get('/users/stats', apiAuth, requireApiRole('gestionnaire'), async (req, res) => {
    try {
        const [totalCitoyens, totalAgents, totalChefAgents, totalGestionnaires] = await Promise.all([
            User.countDocuments({ role: 'citoyen' }),
            User.countDocuments({ role: 'agent' }),
            User.countDocuments({ role: 'chef_agent' }),
            User.countDocuments({ role: 'gestionnaire' })
        ]);

        return res.json({
            ok: true,
            totalCitoyens,
            totalAgents,
            totalChefAgents,
            totalGestionnaires,
            total: totalCitoyens + totalAgents + totalChefAgents + totalGestionnaires
        });
    } catch (err) {
        console.error('Erreur GET /users/stats:', err);
        return res.status(500).json({ ok: false, message: 'Erreur serveur' });
    }
});

router.get('/users/:id', apiAuth, requireApiRole('agent', 'chef_agent', 'gestionnaire'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('name email role ville codePostal adresse perimetreVille pointsTotal cashbackUsedTotal isActive createdAt')
            .lean();

        if (!user) {
            return res.status(404).json({ ok: false, message: 'Utilisateur non trouvé' });
        }

        let signalements = [];
        if (user.role === 'citoyen') {
            signalements = await Signalement.find({ citoyen: req.params.id })
                .sort({ dateSignalement: -1 })
                .limit(50)
                .lean();
        }

        return res.json({
            ok: true,
            user,
            signalements
        });
    } catch (err) {
        console.error('Erreur GET /users/:id:', err);
        return res.status(500).json({ ok: false, message: 'Erreur serveur' });
    }
});

router.patch('/users/:id/toggle-active', apiAuth, requireApiRole('gestionnaire'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ ok: false, message: 'Utilisateur non trouvé' });
        }

        if (user.role === 'gestionnaire' && user.isActive) {
            return res.status(403).json({ ok: false, message: 'Impossible de désactiver un gestionnaire' });
        }

        user.isActive = !user.isActive;
        await user.save();

        return res.json({
            ok: true,
            _id: user._id,
            isActive: user.isActive
        });
    } catch (err) {
        console.error('Erreur PATCH /users/:id/toggle-active:', err);
        return res.status(500).json({ ok: false, message: 'Erreur serveur' });
    }
});

router.post('/users', apiAuth, requireApiRole('gestionnaire'), async (req, res) => {
    try {
        const { name, email, password, role, perimetreVille } = req.body || {};

        if (!name || !email || !password) {
            return res.status(400).json({ ok: false, message: 'Nom, email et mot de passe requis' });
        }

        const allowedRoles = ['agent', 'chef_agent'];
        const finalRole = allowedRoles.includes(role) ? role : 'agent';

        const exists = await User.findOne({ email: email.toLowerCase().trim() });
        if (exists) {
            return res.status(409).json({ ok: false, message: 'Cet email est déjà utilisé' });
        }

        const user = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            role: finalRole,
            perimetreVille: perimetreVille || null,
            isActive: true,
            pointsTotal: 0
        });

        await user.setPassword(password);
        await user.save();

        return res.status(201).json({
            ok: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                perimetreVille: user.perimetreVille,
                isActive: user.isActive
            }
        });
    } catch (err) {
        console.error('Erreur POST /users:', err);
        return res.status(500).json({ ok: false, message: 'Erreur serveur' });
    }
});

router.put('/users/:id', apiAuth, requireApiRole('gestionnaire'), async (req, res) => {
    try {
        const { name, email, role, perimetreVille, ville, pointsTotal } = req.body || {};

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ ok: false, message: 'Utilisateur non trouvé' });
        }

        if (name !== undefined) user.name = name.trim();
        if (email !== undefined) user.email = email.toLowerCase().trim();
        if (role !== undefined && ['citoyen', 'agent', 'chef_agent', 'gestionnaire'].includes(role)) {
            user.role = role;
        }
        if (perimetreVille !== undefined) user.perimetreVille = perimetreVille || null;
        if (ville !== undefined) user.ville = ville || null;
        if (pointsTotal !== undefined && user.role === 'citoyen') {
            user.pointsTotal = parseInt(pointsTotal) || 0;
        }

        await user.save();

        return res.json({
            ok: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                ville: user.ville,
                perimetreVille: user.perimetreVille,
                pointsTotal: user.pointsTotal,
                isActive: user.isActive
            }
        });
    } catch (err) {
        console.error('Erreur PUT /users/:id:', err);
        return res.status(500).json({ ok: false, message: 'Erreur serveur' });
    }
});

router.get('/users', apiAuth, requireApiRole('gestionnaire'), async (req, res) => {
    try {
        const { role, search, ville } = req.query;

        const filter = {};

        if (role && ['citoyen', 'agent', 'chef_agent', 'gestionnaire'].includes(role)) {
            filter.role = role;
        }

        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { name: searchRegex },
                { email: searchRegex }
            ];
        }

        const users = await User.find(filter)
            .select('name email role ville codePostal perimetreVille pointsTotal isActive createdAt')
            .sort({ name: 1 })
            .limit(200)
            .lean();

        const perimetres = await User.distinct('perimetreVille');
        const villesClean = perimetres.filter(Boolean).sort();

        return res.json({
            ok: true,
            items: users,
            total: users.length,
            perimetres: villesClean
        });
    } catch (err) {
        console.error('Erreur GET /users:', err);
        return res.status(500).json({ ok: false, message: 'Erreur serveur' });
    }
});

router.get('/users/stats', apiAuth, requireApiRole('gestionnaire'), async (req, res) => {
    try {
        const [totalCitoyens, totalAgents, totalChefAgents, totalGestionnaires] = await Promise.all([
            User.countDocuments({ role: 'citoyen' }),
            User.countDocuments({ role: 'agent' }),
            User.countDocuments({ role: 'chef_agent' }),
            User.countDocuments({ role: 'gestionnaire' })
        ]);

        return res.json({
            ok: true,
            totalCitoyens,
            totalAgents,
            totalChefAgents,
            totalGestionnaires,
            total: totalCitoyens + totalAgents + totalChefAgents + totalGestionnaires
        });
    } catch (err) {
        console.error('Erreur GET /users/stats:', err);
        return res.status(500).json({ ok: false, message: 'Erreur serveur' });
    }
});


router.patch('/users/:id/toggle-active', apiAuth, requireApiRole('gestionnaire'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ ok: false, message: 'Utilisateur non trouvé' });
        }

        user.isActive = !user.isActive;
        await user.save();

        return res.json({
            ok: true,
            _id: user._id,
            isActive: user.isActive
        });
    } catch (err) {
        console.error('Erreur PATCH /users/:id/toggle-active:', err);
        return res.status(500).json({ ok: false, message: 'Erreur serveur' });
    }
});

module.exports = router;
