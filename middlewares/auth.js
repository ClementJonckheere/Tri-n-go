exports.isAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

exports.requireRole = (...roles) => {
    return (req, res, next) => {
        const user = req.session.user;

        if (!user) {
            return res.redirect('/login');
        }

        if (!roles.includes(user.role)) {
            if (req.originalUrl.startsWith('/admin')) {
                return res
                    .status(404)
                    .send(`Cannot GET ${req.originalUrl}`);
            }
            return res.status(403).render('error.twig', {
                title: 'Accès refusé',
                message: 'Vous n’avez pas les droits pour accéder à cette page.',
            });
        }
        next();
    };
};
