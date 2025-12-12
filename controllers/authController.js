const User = require('../models/users');
const { POINTS_INSCRIPTION } = require('../config/points');

// GET login
exports.showLoginForm = (req, res) => {
    res.render('auth/login.twig', {
        title: 'Connexion',
    });
};

// POST login
exports.login = async (req, res) => {
    try {
        let { email, password } = req.body;

        email = (email || '').trim().toLowerCase();
        password = password || '';

        if (!email || !password) {
            return res.render('auth/login.twig', {
                title: 'Connexion',
                error: 'Veuillez saisir email et mot de passe.',
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.render('auth/login.twig', {
                title: 'Connexion',
                error: 'Identifiants incorrects.',
            });
        }

        if (!user.isActive) {
            return res.render('auth/login.twig', {
                title: 'Connexion',
                error: 'Votre compte est désactivé. Veuillez contacter un gestionnaire.',
            });
        }

        const ok = await user.verifyPassword(password);
        if (!ok) {
            return res.render('auth/login.twig', {
                title: 'Connexion',
                error: 'Identifiants incorrects.',
            });
        }

        req.session.user = {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            perimetreVille: user.perimetreVille || null,
        };


        return res.redirect('/');
    } catch (err) {
        console.error('Erreur login :', err);
        return res.status(500).render('error.twig', {
            title: 'Erreur',
            message: 'Erreur lors de la connexion.',
        });
    }
};

// GET logout
exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
};

// GET register
exports.showRegisterForm = (req, res) => {
    res.render('auth/register.twig', { title: 'Inscription' });
};

// POST register
exports.register = async (req, res) => {
    try {
        const { name, email, password, adresse, ville, codePostal } = req.body;

        let existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            return res.render('auth/register.twig', {
                title: 'Inscription',
                error: 'Un utilisateur existe déjà avec cet email.',
            });
        }

        const user = new User({
            name,
            email: email.toLowerCase().trim(),
            role: 'citoyen',
            adresse: adresse || null,
            ville: ville || null,
            codePostal: codePostal || null,
            perimetreVille: ville || null,
            pointsTotal: POINTS_INSCRIPTION,
        });

        await user.setPassword(password);
        await user.save();

        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.status(500).render('error.twig', {
            title: 'Erreur',
            message: 'Erreur lors de l’inscription.',
        });
    }
};