// controllers/pagesController.js

// Page CGU
exports.cgu = (req, res) => {
    res.render('pages/cgu.twig', {
        title: "Conditions Générales d'Utilisation",
    });
};

// Page Politique de confidentialité
exports.confidentialite = (req, res) => {
    res.render('pages/confidentialite.twig', {
        title: 'Politique de Confidentialité',
    });
};

// Page Contact (GET)
exports.showContact = (req, res) => {
    res.render('pages/contact.twig', {
        title: 'Contactez-nous',
    });
};

// Page Contact (POST)
exports.submitContact = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validation basique
        if (!name || !email || !subject || !message) {
            return res.render('pages/contact.twig', {
                title: 'Contactez-nous',
                error: 'Tous les champs sont obligatoires.',
            });
        }

        // Ici vous pourriez :
        // - Envoyer un email (avec nodemailer)
        // - Sauvegarder en base de données
        // - Envoyer vers un service externe

        console.log('[CONTACT] Nouveau message reçu :');
        console.log('  - Nom:', name);
        console.log('  - Email:', email);
        console.log('  - Sujet:', subject);
        console.log('  - Message:', message);

        // Pour l'instant, on simule un succès
        res.render('pages/contact.twig', {
            title: 'Contactez-nous',
            success: true,
        });
    } catch (err) {
        console.error('Erreur submitContact :', err);
        res.render('pages/contact.twig', {
            title: 'Contactez-nous',
            error: 'Une erreur est survenue. Veuillez réessayer.',
        });
    }
};

// Page FAQ (optionnelle)
exports.faq = (req, res) => {
    const faqs = [
        {
            question: "Comment signaler un encombrant ?",
            answer: "Connectez-vous à votre compte, cliquez sur 'Déclarer un encombrant', remplissez le formulaire avec l'adresse précise et une photo si possible, puis validez."
        },
        {
            question: "Comment fonctionnent les points ?",
            answer: "Vous gagnez des points à chaque signalement validé par nos agents. Ces points peuvent être convertis en cashback utilisable dans les déchèteries partenaires."
        },
        {
            question: "Combien de temps pour la collecte ?",
            answer: "Le délai moyen de collecte est de 3 à 5 jours ouvrés après validation du signalement, selon la charge de travail des équipes."
        },
        {
            question: "Puis-je modifier un signalement ?",
            answer: "Une fois soumis, un signalement ne peut pas être modifié. Vous pouvez cependant nous contacter si vous avez fait une erreur."
        },
        {
            question: "Comment utiliser mon cashback ?",
            answer: "Rendez-vous sur la page 'Mes points', cliquez sur 'Utiliser mon cashback' et suivez les instructions pour générer un bon de réduction."
        },
        {
            question: "Mon signalement a été refusé, pourquoi ?",
            answer: "Un signalement peut être refusé si l'adresse est incorrecte, si l'encombrant a déjà été collecté, ou s'il ne correspond pas aux critères de collecte."
        },
    ];

    res.render('pages/faq.twig', {
        title: 'FAQ - Questions fréquentes',
        faqs,
    });
};