const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tringo';
const SALT_ROUNDS = 10;

const DEFAULT_PASSWORD = 'Password123!';

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['citoyen', 'agent', 'chef_agent', 'gestionnaire'], default: 'citoyen' },
    adresse: { type: String, maxLength: 200 },
    ville: { type: String, maxLength: 100 },
    codePostal: { type: String, match: /^[0-9]{5}$/ },
    perimetreVille: { type: String },
    chefAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pointsTotal: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    cashbackUsedTotal: { type: Number, default: 0 },
    decheterieAccountNumber: { type: String, default: null },
}, { timestamps: true });

const signalementSchema = new mongoose.Schema({
    description: { type: String, maxLength: 200, required: true },
    typeEncombrant: { type: String, enum: ['meuble', 'electromenager', 'dechets_verts', 'plastiques', 'bois', 'verre'], required: true },
    adresse: { type: String, maxLength: 200, required: true },
    ville: { type: String, maxLength: 100, required: true },
    codePostal: { type: String, match: /^[0-9]{5}$/, required: true },
    statut: { type: String, enum: ['signale', 'valide', 'en_cours', 'collecte', 'refuse'], default: 'signale' },
    dateSignalement: { type: Date, default: Date.now },
    photoFilename: { type: String, default: null },
    citoyen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pointsAttribues: { type: Number, default: 0 },
    pointsCredites: { type: Boolean, default: false },
    historiqueStatuts: [{
        from: { type: String },
        to: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    }],
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Signalement = mongoose.model('Signalement', signalementSchema);

// ============================================================
// DONNÉES DE SEED
// ============================================================

// Utilisateurs
const usersData = [
    // Gestionnaire
    {
        email: 'admin@tringo.fr',
        name: 'Marie Dupont',
        role: 'gestionnaire',
        ville: 'Amiens',
        codePostal: '80000',
        adresse: '1 Place de l\'Hôtel de Ville',
        perimetreVille: null,
        pointsTotal: 0,
    },
    // Chef d'équipe Amiens
    {
        email: 'chef.amiens@tringo.fr',
        name: 'Pierre Martin',
        role: 'chef_agent',
        ville: 'Amiens',
        codePostal: '80000',
        adresse: '15 Rue de la République',
        perimetreVille: 'Amiens',
        pointsTotal: 0,
    },
    // Chef d'équipe Méru
    {
        email: 'chef.meru@tringo.fr',
        name: 'Sophie Bernard',
        role: 'chef_agent',
        ville: 'Méru',
        codePostal: '60110',
        adresse: '8 Rue de la Mairie',
        perimetreVille: 'Méru',
        pointsTotal: 0,
    },
    // Agents Amiens
    {
        email: 'agent1.amiens@tringo.fr',
        name: 'Lucas Petit',
        role: 'agent',
        ville: 'Amiens',
        codePostal: '80000',
        adresse: '22 Boulevard Alsace-Lorraine',
        perimetreVille: 'Amiens',
        pointsTotal: 0,
    },
    {
        email: 'agent2.amiens@tringo.fr',
        name: 'Emma Leroy',
        role: 'agent',
        ville: 'Amiens',
        codePostal: '80000',
        adresse: '45 Rue Saint-Fuscien',
        perimetreVille: 'Amiens',
        pointsTotal: 0,
    },
    // Agent Méru
    {
        email: 'agent.meru@tringo.fr',
        name: 'Thomas Moreau',
        role: 'agent',
        ville: 'Méru',
        codePostal: '60110',
        adresse: '12 Rue de Beauvais',
        perimetreVille: 'Méru',
        pointsTotal: 0,
    },
    // Citoyens Amiens
    {
        email: 'jean.durand@email.fr',
        name: 'Jean Durand',
        role: 'citoyen',
        ville: 'Amiens',
        codePostal: '80000',
        adresse: '78 Rue Jules Barni',
        perimetreVille: 'Amiens',
        pointsTotal: 185,
        decheterieAccountNumber: 'DEC-80-00001',
    },
    {
        email: 'claire.simon@email.fr',
        name: 'Claire Simon',
        role: 'citoyen',
        ville: 'Amiens',
        codePostal: '80000',
        adresse: '34 Avenue de la Paix',
        perimetreVille: 'Amiens',
        pointsTotal: 320,
        cashbackUsedTotal: 14.00,
        decheterieAccountNumber: 'DEC-80-00002',
    },
    {
        email: 'michel.robert@email.fr',
        name: 'Michel Robert',
        role: 'citoyen',
        ville: 'Amiens',
        codePostal: '80000',
        adresse: '56 Rue Delpech',
        perimetreVille: 'Amiens',
        pointsTotal: 95,
    },
    {
        email: 'isabelle.richard@email.fr',
        name: 'Isabelle Richard',
        role: 'citoyen',
        ville: 'Amiens',
        codePostal: '80080',
        adresse: '123 Chaussée Jules Ferry',
        perimetreVille: 'Amiens',
        pointsTotal: 450,
        cashbackUsedTotal: 31.50,
        decheterieAccountNumber: 'DEC-80-00003',
    },
    {
        email: 'paul.thomas@email.fr',
        name: 'Paul Thomas',
        role: 'citoyen',
        ville: 'Amiens',
        codePostal: '80000',
        adresse: '89 Rue de Noyon',
        perimetreVille: 'Amiens',
        pointsTotal: 75,
    },
    // Citoyens Méru
    {
        email: 'marie.blanc@email.fr',
        name: 'Marie Blanc',
        role: 'citoyen',
        ville: 'Méru',
        codePostal: '60110',
        adresse: '5 Rue de la Gare',
        perimetreVille: 'Méru',
        pointsTotal: 210,
        decheterieAccountNumber: 'DEC-60-00001',
    },
    {
        email: 'francois.noir@email.fr',
        name: 'François Noir',
        role: 'citoyen',
        ville: 'Méru',
        codePostal: '60110',
        adresse: '27 Rue du Général de Gaulle',
        perimetreVille: 'Méru',
        pointsTotal: 130,
    },
    {
        email: 'anne.lambert@email.fr',
        name: 'Anne Lambert',
        role: 'citoyen',
        ville: 'Méru',
        codePostal: '60110',
        adresse: '14 Place de la Liberté',
        perimetreVille: 'Méru',
        pointsTotal: 85,
    },
    // Citoyen inactif pour test
    {
        email: 'ancien.user@email.fr',
        name: 'Ancien Utilisateur',
        role: 'citoyen',
        ville: 'Amiens',
        codePostal: '80000',
        adresse: '1 Rue Test',
        perimetreVille: 'Amiens',
        pointsTotal: 50,
        isActive: false,
    },
];
const signalementsData = [
    {
        citoyenEmail: 'jean.durand@email.fr',
        description: 'Vieux canapé 3 places en cuir marron, déposé sur le trottoir',
        typeEncombrant: 'meuble',
        adresse: '78 Rue Jules Barni',
        ville: 'Amiens',
        codePostal: '80000',
        statut: 'collecte',
        dateSignalement: new Date('2025-11-15'),
        pointsAttribues: 25,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'jean.durand@email.fr',
        description: 'Machine à laver hors service',
        typeEncombrant: 'electromenager',
        adresse: '80 Rue Jules Barni',
        ville: 'Amiens',
        codePostal: '80000',
        statut: 'collecte',
        dateSignalement: new Date('2025-12-02'),
        pointsAttribues: 20,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'jean.durand@email.fr',
        description: 'Tas de branches et feuilles mortes',
        typeEncombrant: 'dechets_verts',
        adresse: '15 Avenue Foy',
        ville: 'Amiens',
        codePostal: '80000',
        statut: 'valide',
        dateSignalement: new Date('2026-01-20'),
        pointsAttribues: 15,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'jean.durand@email.fr',
        description: 'Armoire en bois démontée',
        typeEncombrant: 'bois',
        adresse: '78 Rue Jules Barni',
        ville: 'Amiens',
        codePostal: '80000',
        statut: 'en_cours',
        dateSignalement: new Date('2026-02-10'),
        pointsAttribues: 0,
        pointsCredites: false,
    },
    {
        citoyenEmail: 'claire.simon@email.fr',
        description: 'Réfrigérateur ancien modèle',
        typeEncombrant: 'electromenager',
        adresse: '34 Avenue de la Paix',
        ville: 'Amiens',
        codePostal: '80000',
        statut: 'collecte',
        dateSignalement: new Date('2025-11-08'),
        pointsAttribues: 30,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'claire.simon@email.fr',
        description: 'Table de jardin en plastique cassée',
        typeEncombrant: 'plastiques',
        adresse: '36 Avenue de la Paix',
        ville: 'Amiens',
        codePostal: '80000',
        statut: 'collecte',
        dateSignalement: new Date('2025-11-22'),
        pointsAttribues: 25,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'claire.simon@email.fr',
        description: 'Lit 2 places avec sommier',
        typeEncombrant: 'meuble',
        adresse: '12 Rue Lemerchier',
        ville: 'Amiens',
        codePostal: '80000',
        statut: 'collecte',
        dateSignalement: new Date('2025-12-05'),
        pointsAttribues: 30,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'claire.simon@email.fr',
        description: 'Haie taillée - gros volume de branches',
        typeEncombrant: 'dechets_verts',
        adresse: '34 Avenue de la Paix',
        ville: 'Amiens',
        codePostal: '80000',
        statut: 'collecte',
        dateSignalement: new Date('2025-12-18'),
        pointsAttribues: 25,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'claire.simon@email.fr',
        description: 'Four micro-ondes et grille-pain',
        typeEncombrant: 'electromenager',
        adresse: '34 Avenue de la Paix',
        ville: 'Amiens',
        codePostal: '80000',
        statut: 'collecte',
        dateSignalement: new Date('2026-01-10'),
        pointsAttribues: 20,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'claire.simon@email.fr',
        description: 'Chaises de bureau x3',
        typeEncombrant: 'meuble',
        adresse: '34 Avenue de la Paix',
        ville: 'Amiens',
        codePostal: '80000',
        statut: 'valide',
        dateSignalement: new Date('2026-01-28'),
        pointsAttribues: 25,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'claire.simon@email.fr',
        description: 'Palette en bois abîmée',
        typeEncombrant: 'bois',
        adresse: '40 Avenue de la Paix',
        ville: 'Amiens',
        codePostal: '80000',
        statut: 'signale',
        dateSignalement: new Date('2026-02-15'),
        pointsAttribues: 0,
        pointsCredites: false,
    },
    {
        citoyenEmail: 'michel.robert@email.fr',
        description: 'Vieille télévision cathodique',
        typeEncombrant: 'electromenager',
        adresse: '56 Rue Delpech',
        ville: 'Amiens',
        codePostal: '80000',
        statut: 'collecte',
        dateSignalement: new Date('2025-12-12'),
        pointsAttribues: 20,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'michel.robert@email.fr',
        description: 'Matelas 140x190 usagé',
        typeEncombrant: 'meuble',
        adresse: '56 Rue Delpech',
        ville: 'Amiens',
        codePostal: '80000',
        statut: 'en_cours',
        dateSignalement: new Date('2026-02-01'),
        pointsAttribues: 0,
        pointsCredites: false,
    },
    {
        citoyenEmail: 'isabelle.richard@email.fr',
        description: 'Bureau en bois massif',
        typeEncombrant: 'meuble',
        adresse: '123 Chaussée Jules Ferry',
        ville: 'Amiens',
        codePostal: '80080',
        statut: 'collecte',
        dateSignalement: new Date('2025-11-05'),
        pointsAttribues: 30,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'isabelle.richard@email.fr',
        description: 'Lave-vaisselle en panne',
        typeEncombrant: 'electromenager',
        adresse: '123 Chaussée Jules Ferry',
        ville: 'Amiens',
        codePostal: '80080',
        statut: 'collecte',
        dateSignalement: new Date('2025-11-18'),
        pointsAttribues: 25,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'isabelle.richard@email.fr',
        description: 'Tondeuse à gazon cassée',
        typeEncombrant: 'electromenager',
        adresse: '123 Chaussée Jules Ferry',
        ville: 'Amiens',
        codePostal: '80080',
        statut: 'collecte',
        dateSignalement: new Date('2025-12-01'),
        pointsAttribues: 25,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'isabelle.richard@email.fr',
        description: 'Sacs de terreau vides et pots cassés',
        typeEncombrant: 'plastiques',
        adresse: '125 Chaussée Jules Ferry',
        ville: 'Amiens',
        codePostal: '80080',
        statut: 'collecte',
        dateSignalement: new Date('2025-12-15'),
        pointsAttribues: 20,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'isabelle.richard@email.fr',
        description: 'Étagères IKEA démontées',
        typeEncombrant: 'meuble',
        adresse: '123 Chaussée Jules Ferry',
        ville: 'Amiens',
        codePostal: '80080',
        statut: 'collecte',
        dateSignalement: new Date('2025-12-28'),
        pointsAttribues: 25,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'isabelle.richard@email.fr',
        description: 'Branches de sapin de Noël',
        typeEncombrant: 'dechets_verts',
        adresse: '123 Chaussée Jules Ferry',
        ville: 'Amiens',
        codePostal: '80080',
        statut: 'collecte',
        dateSignalement: new Date('2026-01-08'),
        pointsAttribues: 20,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'isabelle.richard@email.fr',
        description: 'Commode 4 tiroirs',
        typeEncombrant: 'meuble',
        adresse: '123 Chaussée Jules Ferry',
        ville: 'Amiens',
        codePostal: '80080',
        statut: 'collecte',
        dateSignalement: new Date('2026-01-22'),
        pointsAttribues: 30,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'isabelle.richard@email.fr',
        description: 'Planches de bois diverses',
        typeEncombrant: 'bois',
        adresse: '123 Chaussée Jules Ferry',
        ville: 'Amiens',
        codePostal: '80080',
        statut: 'valide',
        dateSignalement: new Date('2026-02-05'),
        pointsAttribues: 25,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'isabelle.richard@email.fr',
        description: 'Miroir brisé avec cadre',
        typeEncombrant: 'verre',
        adresse: '123 Chaussée Jules Ferry',
        ville: 'Amiens',
        codePostal: '80080',
        statut: 'signale',
        dateSignalement: new Date('2026-02-18'),
        pointsAttribues: 0,
        pointsCredites: false,
    },
    {
        citoyenEmail: 'paul.thomas@email.fr',
        description: 'Chaise de jardin en plastique',
        typeEncombrant: 'plastiques',
        adresse: '89 Rue de Noyon',
        ville: 'Amiens',
        codePostal: '80000',
        statut: 'collecte',
        dateSignalement: new Date('2026-01-15'),
        pointsAttribues: 15,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'paul.thomas@email.fr',
        description: 'Table basse en verre fêlé',
        typeEncombrant: 'verre',
        adresse: '89 Rue de Noyon',
        ville: 'Amiens',
        codePostal: '80000',
        statut: 'en_cours',
        dateSignalement: new Date('2026-02-08'),
        pointsAttribues: 0,
        pointsCredites: false,
    },

    {
        citoyenEmail: 'marie.blanc@email.fr',
        description: 'Canapé-lit défraîchi',
        typeEncombrant: 'meuble',
        adresse: '5 Rue de la Gare',
        ville: 'Méru',
        codePostal: '60110',
        statut: 'collecte',
        dateSignalement: new Date('2025-11-20'),
        pointsAttribues: 25,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'marie.blanc@email.fr',
        description: 'Sèche-linge hors service',
        typeEncombrant: 'electromenager',
        adresse: '5 Rue de la Gare',
        ville: 'Méru',
        codePostal: '60110',
        statut: 'collecte',
        dateSignalement: new Date('2025-12-10'),
        pointsAttribues: 25,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'marie.blanc@email.fr',
        description: 'Taille de haies - sacs de branches',
        typeEncombrant: 'dechets_verts',
        adresse: '7 Rue de la Gare',
        ville: 'Méru',
        codePostal: '60110',
        statut: 'collecte',
        dateSignalement: new Date('2026-01-05'),
        pointsAttribues: 20,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'marie.blanc@email.fr',
        description: 'Bibliothèque en bois',
        typeEncombrant: 'bois',
        adresse: '5 Rue de la Gare',
        ville: 'Méru',
        codePostal: '60110',
        statut: 'valide',
        dateSignalement: new Date('2026-02-02'),
        pointsAttribues: 20,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'francois.noir@email.fr',
        description: 'Radiateur électrique ancien',
        typeEncombrant: 'electromenager',
        adresse: '27 Rue du Général de Gaulle',
        ville: 'Méru',
        codePostal: '60110',
        statut: 'collecte',
        dateSignalement: new Date('2025-12-20'),
        pointsAttribues: 20,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'francois.noir@email.fr',
        description: 'Fauteuil de salon usé',
        typeEncombrant: 'meuble',
        adresse: '27 Rue du Général de Gaulle',
        ville: 'Méru',
        codePostal: '60110',
        statut: 'collecte',
        dateSignalement: new Date('2026-01-18'),
        pointsAttribues: 25,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'francois.noir@email.fr',
        description: 'Débris de clôture en bois',
        typeEncombrant: 'bois',
        adresse: '29 Rue du Général de Gaulle',
        ville: 'Méru',
        codePostal: '60110',
        statut: 'signale',
        dateSignalement: new Date('2026-02-12'),
        pointsAttribues: 0,
        pointsCredites: false,
    },
    {
        citoyenEmail: 'anne.lambert@email.fr',
        description: 'Tas de feuilles mortes',
        typeEncombrant: 'dechets_verts',
        adresse: '14 Place de la Liberté',
        ville: 'Méru',
        codePostal: '60110',
        statut: 'collecte',
        dateSignalement: new Date('2025-11-25'),
        pointsAttribues: 15,
        pointsCredites: true,
    },
    {
        citoyenEmail: 'anne.lambert@email.fr',
        description: 'Petite commode en bois',
        typeEncombrant: 'meuble',
        adresse: '14 Place de la Liberté',
        ville: 'Méru',
        codePostal: '60110',
        statut: 'en_cours',
        dateSignalement: new Date('2026-02-06'),
        pointsAttribues: 0,
        pointsCredites: false,
    },

    {
        citoyenEmail: 'paul.thomas@email.fr',
        description: 'Déchets ménagers classiques (non encombrant)',
        typeEncombrant: 'plastiques',
        adresse: '89 Rue de Noyon',
        ville: 'Amiens',
        codePostal: '80000',
        statut: 'refuse',
        dateSignalement: new Date('2026-01-25'),
        pointsAttribues: 0,
        pointsCredites: false,
    },
];

async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}

function generateHistorique(signalement, citoyenId, agentId) {
    const historique = [];
    const baseDate = new Date(signalement.dateSignalement);

    historique.push({
        from: null,
        to: 'signale',
        changedAt: baseDate,
        changedBy: citoyenId,
    });

    if (signalement.statut === 'signale') {
        return historique;
    }

    if (['valide', 'en_cours', 'collecte', 'refuse'].includes(signalement.statut)) {
        const validateDate = new Date(baseDate);
        validateDate.setDate(validateDate.getDate() + Math.floor(Math.random() * 2) + 1);

        if (signalement.statut === 'refuse') {
            historique.push({
                from: 'signale',
                to: 'refuse',
                changedAt: validateDate,
                changedBy: agentId,
            });
            return historique;
        }

        historique.push({
            from: 'signale',
            to: 'valide',
            changedAt: validateDate,
            changedBy: agentId,
        });
    }

    if (signalement.statut === 'valide') {
        return historique;
    }

    if (['en_cours', 'collecte'].includes(signalement.statut)) {
        const lastDate = historique[historique.length - 1].changedAt;
        const enCoursDate = new Date(lastDate);
        enCoursDate.setDate(enCoursDate.getDate() + Math.floor(Math.random() * 2) + 2);

        historique.push({
            from: 'valide',
            to: 'en_cours',
            changedAt: enCoursDate,
            changedBy: agentId,
        });
    }

    if (signalement.statut === 'en_cours') {
        return historique;
    }
    if (signalement.statut === 'collecte') {
        const lastDate = historique[historique.length - 1].changedAt;
        const collecteDate = new Date(lastDate);
        collecteDate.setDate(collecteDate.getDate() + Math.floor(Math.random() * 3) + 1);

        historique.push({
            from: 'en_cours',
            to: 'collecte',
            changedAt: collecteDate,
            changedBy: agentId,
        });
    }

    return historique;
}


async function seed() {
    console.log('Démarrage du seed...\n');

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connecté à MongoDB\n');

        await User.deleteMany({});
        await Signalement.deleteMany({});
        console.log('Base de données vidée\n');

        const passwordHash = await hashPassword(DEFAULT_PASSWORD);
        const usersMap = new Map();

        for (const userData of usersData) {
            const user = new User({
                ...userData,
                passwordHash,
            });
            await user.save();
            usersMap.set(userData.email, user);
            console.log(`   ✓ ${userData.role.padEnd(12)} : ${userData.name} (${userData.email})`);
        }
        console.log(`\n${usersData.length} utilisateurs créés\n`);

        const agentsAmiens = [
            usersMap.get('agent1.amiens@tringo.fr'),
            usersMap.get('agent2.amiens@tringo.fr'),
            usersMap.get('chef.amiens@tringo.fr'),
        ];
        const agentsMeru = [
            usersMap.get('agent.meru@tringo.fr'),
            usersMap.get('chef.meru@tringo.fr'),
        ];

        let countByStatus = { signale: 0, valide: 0, en_cours: 0, collecte: 0, refuse: 0 };

        for (const sigData of signalementsData) {
            const citoyen = usersMap.get(sigData.citoyenEmail);
            if (!citoyen) {
                console.log(`Citoyen non trouvé: ${sigData.citoyenEmail}`);
                continue;
            }

            const agents = sigData.ville === 'Méru' ? agentsMeru : agentsAmiens;
            const agent = agents[Math.floor(Math.random() * agents.length)];

            const signalement = new Signalement({
                description: sigData.description,
                typeEncombrant: sigData.typeEncombrant,
                adresse: sigData.adresse,
                ville: sigData.ville,
                codePostal: sigData.codePostal,
                statut: sigData.statut,
                dateSignalement: sigData.dateSignalement,
                citoyen: citoyen._id,
                pointsAttribues: sigData.pointsAttribues,
                pointsCredites: sigData.pointsCredites,
                historiqueStatuts: generateHistorique(sigData, citoyen._id, agent._id),
            });

            await signalement.save();
            countByStatus[sigData.statut]++;
        }

        console.log(`\n${signalementsData.length} signalements créés`);
        console.log(`   - Signalés    : ${countByStatus.signale}`);
        console.log(`   - Validés     : ${countByStatus.valide}`);
        console.log(`   - En cours    : ${countByStatus.en_cours}`);
        console.log(`   - Collectés   : ${countByStatus.collecte}`);
        console.log(`   - Refusés     : ${countByStatus.refuse}\n`);

    } catch (error) {
        console.error('Erreur lors du seed :', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Déconnecté de MongoDB');
    }
}

seed();