const User = require('../models/users');

// Liste des utilisateurs (citoyens et agents)
async function listUsers(req, res) {
  try {
    const { perimetreVille } = req.query;

    // Pagination : 20 par page
    const perPage = 20;
    const pageAgents = Math.max(parseInt(req.query.pageAgents || '1', 10), 1);
    const pageCitoyens = Math.max(parseInt(req.query.pageCitoyens || '1', 10), 1);

    const baseFilter = {};

    // Filtre périmètre (ville)
    if (perimetreVille && perimetreVille.trim() !== '') {
      baseFilter.perimetreVille = perimetreVille.trim();
    }
    const citoyensFilter = {
      ...baseFilter,
      role: 'citoyen',
    };
    const agentsFilter = {
      ...baseFilter,
      role: { $in: ['agent', 'chef_agent', 'gestionnaire'] },
    };

    // Comptages
    const [citoyensCount, agentsCount] = await Promise.all([
      User.countDocuments(citoyensFilter),
      User.countDocuments(agentsFilter),
    ]);

    // Pages totales
    const citoyensTotalPages = Math.max(Math.ceil(citoyensCount / perPage), 1);
    const agentsTotalPages = Math.max(Math.ceil(agentsCount / perPage), 1);
    const safePageCitoyens = Math.min(pageCitoyens, citoyensTotalPages);
    const safePageAgents = Math.min(pageAgents, agentsTotalPages);

    // Récupération des données paginées
    const [citoyens, agents] = await Promise.all([
      User.find(citoyensFilter)
          .sort({ name: 1 })
          .skip((safePageCitoyens - 1) * perPage)
          .limit(perPage),

      User.find(agentsFilter)
          .sort({ name: 1 })
          .skip((safePageAgents - 1) * perPage)
          .limit(perPage),
    ]);

    // liste des périmètres (villes)
    let perimetres = await User.distinct('perimetreVille');
    perimetres = perimetres.filter(Boolean).sort();

    res.render('users/list.twig', {
      title: 'Gestion des utilisateurs',
      citoyens,
      agents,
      perimetres,

      currentPerimetreFilter: perimetreVille || '',

      agentsPage: safePageAgents,
      agentsTotalPages,

      citoyensPage: safePageCitoyens,
      citoyensTotalPages,
    });
  } catch (err) {
    console.error('Erreur listUsers :', err);
    res.status(500).render('error.twig', {
      title: 'Erreur',
      message: 'Erreur lors du chargement des utilisateurs.',
    });
  }
}

// Formulaire de création d’un agent / chef d’agent
async function showCreateAgentForm(req, res) {
  try {
    // on récupère les chefs d’agents existants
    const chefs = await User.find({ role: 'chef_agent', isActive: true }).sort({ name: 1 });

    res.render('users/new-agent.twig', {
      title: 'Créer un agent ou chef d’agent',
      chefs,
    });
  } catch (err) {
    console.error('Erreur showCreateAgentForm :', err);
    res.status(500).render('error.twig', {
      title: 'Erreur',
      message: 'Erreur lors du chargement du formulaire.',
    });
  }
}

// Création d’un agent / chef d’agent
async function createAgent(req, res) {
  try {
    const { name, email, password, role, perimetreVille, chefAgentId } = req.body;
    const finalRole = role === 'chef_agent' ? 'chef_agent' : 'agent';
    const cleanEmail = (email || '').toLowerCase().trim();
    let existing = await User.findOne({ email: cleanEmail });

    if (existing) {
      return res.render('users/new-agent.twig', {
        title: 'Créer un agent ou chef d’agent',
        error: 'Un utilisateur existe déjà avec cet email.',
      });
    }

    const user = new User({
      name,
      email: cleanEmail,
      role: finalRole,
      perimetreVille: perimetreVille || null,
      pointsTotal: 0,
    });

    if (finalRole === 'agent' && chefAgentId) {
      user.chefAgent = chefAgentId;
    }

    await user.setPassword(password);
    await user.save();

    res.redirect('/admin/utilisateurs');
  } catch (err) {
    console.error('Erreur createAgent :', err);
    res.status(500).render('error.twig', {
      title: 'Erreur',
      message: 'Erreur lors de la création de l’agent.',
    });
  }
}

// Formulaire d’edit d’un utilisateur
async function showEditForm(req, res) {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).render('error.twig', {
        title: 'Utilisateur introuvable',
        message: 'Cet utilisateur n’existe pas.',
      });
    }
    const chefs = await User.find({ role: 'chef_agent', isActive: true }).lean();

    // agents rattachés si c’est un chef d’agent
    let agents = [];
    if (user.role === 'chef_agent') {
      agents = await User.find({ chefAgent: user._id }).lean();
    }

    res.render('users/edit.twig', {
      title: 'Modifier l’utilisateur',
      editUser: user,
      chefs,
      agents,
      currentChefId: user.chefAgent ? user.chefAgent.toString() : null,
    });
  } catch (err) {
    console.error('Erreur showEditForm :', err);
    res.status(500).render('error.twig', {
      title: 'Erreur',
      message: 'Erreur lors du chargement de l’utilisateur.',
    });
  }
}


// ===============================================
// Traitement de l’édition d’un utilisateur
// POST /admin/utilisateurs/:id/edit
// ===============================================
async function updateUser(req, res) {
  try {
    const userId = req.params.id;
    const {
      name,
      email,
      role,
      isActive,
      pointsTotal,
      perimetreVille,
      chefAgentId,
      adresse,
      ville,
      codePostal,
    } = req.body;

    const cleanEmail = (email || '').toLowerCase().trim();
    const finalRole = ['citoyen', 'agent', 'chef_agent', 'gestionnaire'].includes(role)
        ? role
        : 'citoyen';

    const updateData = {
      name,
      email: cleanEmail,
      role: finalRole,
      isActive: isActive === 'on',
      adresse: adresse || null,
      ville: ville || null,
      codePostal: codePostal || null,
      perimetreVille: perimetreVille || null,
    };

    // Gestion des points
    if (finalRole === 'citoyen') {
      if (typeof pointsTotal !== 'undefined') {
        updateData.pointsTotal = Number(pointsTotal) || 0;
      }
      if (ville) {
        updateData.perimetreVille = ville;
      }
    } else {
      updateData.pointsTotal = 0;
    }

    // Chef agent pour un AGENT
    if (finalRole === 'agent') {
      if (chefAgentId) {
        updateData.chefAgent = chefAgentId;
      } else {
        updateData.chefAgent = null;
      }
    } else {
      updateData.chefAgent = null;
    }

    await User.findByIdAndUpdate(userId, updateData);

    res.redirect('/admin/utilisateurs');
  } catch (err) {
    console.error('Erreur updateUser :', err);
    res.status(500).render('error.twig', {
      title: 'Erreur',
      message: 'Erreur lors de la mise à jour de l’utilisateur.',
    });
  }
}


// Suppression d’un utilisateur
async function deleteUser(req, res) {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/admin/utilisateurs');
  } catch (err) {
    console.error('Erreur deleteUser :', err);
    res.status(500).render('error.twig', {
      title: 'Erreur',
      message: 'Erreur lors de la suppression de l’utilisateur.',
    });
  }
}

module.exports = {
  listUsers,
  showCreateAgentForm,
  createAgent,
  showEditForm,
  updateUser,
  deleteUser,
};
