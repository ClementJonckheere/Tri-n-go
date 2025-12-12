const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');

const signalementsController = require('../controllers/signalementsController');
const statsController = require('../controllers/statsController');
const { isAuthenticated, requireRole } = require('../middlewares/auth');


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads'));
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, unique + ext);
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);
    if (extOk && mimeOk) {
        cb(null, true);
    } else {
        cb(new Error('Type de fichier non supporté (jpg, png, gif uniquement).'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});

router.get('/geocode',
    isAuthenticated,
    signalementsController.geocodeAdresse
);

router.get('/', isAuthenticated, requireRole('citoyen'), signalementsController.listSignalementsCitoyen);
router.get('/nouveau', isAuthenticated, requireRole('citoyen'), signalementsController.showCreateForm);
router.post('/', isAuthenticated, requireRole('citoyen'), upload.single('photo'), signalementsController.createSignalement);
router.get('/gestion', isAuthenticated, requireRole('agent', 'chef_agent', 'gestionnaire'), signalementsController.listGestion);
router.post('/:id/statut', isAuthenticated, requireRole('agent','chef_agent', 'gestionnaire'), signalementsController.updateStatut);
router.get('/citoyen/:id', isAuthenticated, requireRole('agent', 'chef_agent', 'gestionnaire'), signalementsController.detailCitoyen);
router.get('/stats', isAuthenticated, requireRole('agent', 'chef_agent', 'gestionnaire'), statsController.dashboard);

module.exports = router;
