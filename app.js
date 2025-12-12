const express = require('express');
const path = require('path');
const twig = require('twig');
const session = require('express-session');;
const geocodingRouter = require('./routes/geocoding');
const pointsRoutes = require('./routes/points');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.use(express.static(path.join(__dirname, 'public')));

// ===== Sessions (en mémoire, suffisant pour ton projet) =====
app.use(
    session({
        secret: 'mp3-encombrants-secret', // à mettre en .env en vrai projet
        resave: false,
        saveUninitialized: false,
    })
);

// Mettre l'utilisateur courant à dispo dans les vues
app.use((req, res, next) => {
    res.locals.session = req.session;  // 👈 dispo dans tous les .twig
    next();
});

// ===== Twig =====
app.engine('twig', twig.__express);
app.set('view engine', 'twig');
app.set('views', path.join(__dirname, 'views'));

const indexRouter = require('./routes/index');
const signalementsRouter = require('./routes/signalements');
const authRouter = require('./routes/auth');
const {isAuthenticated, requireRole} = require("./middlewares/auth");
const citoyenRoutes = require('./routes/citoyen');

app.use('/admin', isAuthenticated, requireRole('gestionnaire'));
app.use('/', indexRouter);
app.use(geocodingRouter);
app.use('/signalements', signalementsRouter);
app.use('/', authRouter);
app.use(pointsRoutes);
app.use('/', citoyenRoutes);

module.exports = app;
