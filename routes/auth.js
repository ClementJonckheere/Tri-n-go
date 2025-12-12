// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const usersController = require('../controllers/usersController');
const { isAuthenticated, requireRole } = require('../middlewares/auth');

// Auth public
router.get('/login', authController.showLoginForm);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.get('/register', authController.showRegisterForm);
router.post('/register', authController.register);

router.use('/admin', isAuthenticated, requireRole('gestionnaire'));
router.get('/admin/users', usersController.listUsers);
router.get('/admin/utilisateurs', (req, res) => {
    const queryIndex = req.url.indexOf('?');
    const query = queryIndex !== -1 ? req.url.slice(queryIndex) : '';
    return res.redirect(302, '/admin/users' + query);
});

// Création Agent
router.get('/admin/agents/nouveau', usersController.showCreateAgentForm);
router.post('/admin/agents', usersController.createAgent);

// Edition / suppression
router.get('/admin/users/:id/edit', usersController.showEditForm);
router.post('/admin/users/:id/edit', usersController.updateUser);
router.post('/admin/users/:id/delete', usersController.deleteUser);


router.get('/admin/utilisateurs/:id/edit', usersController.showEditForm);
router.post('/admin/utilisateurs/:id/edit', usersController.updateUser);
router.post('/admin/utilisateurs/:id/delete', usersController.deleteUser);

module.exports = router;
