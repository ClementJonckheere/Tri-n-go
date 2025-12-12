const mongoose = require('mongoose');

const signalementSchema = new mongoose.Schema(
    {
        description: { type: String, maxLength: 200, required: true },
        typeEncombrant: {
            type: String,
            enum: ['meuble', 'electromenager', 'dechets_verts', 'plastiques', 'bois', 'verre'],
            required: true,
        },
        adresse: { type: String, maxLength: 200, required: true },
        ville: { type: String, maxLength: 100, required: true },
        codePostal: { type: String, match: /^[0-9]{5}$/, required: true },

        statut: {
            type: String,
            enum: ['signale', 'valide', 'en_cours', 'collecte'],
            default: 'signale',
        },
        dateSignalement: { type: Date, default: Date.now },

        photoFilename: { type: String, default: null },

        citoyen: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        pointsAttribues: { type: Number, default: 0 },
        pointsCredites: { type: Boolean, default: false },

        historiqueStatuts: [
            {
                from: { type: String },
                to: { type: String, required: true },
                changedAt: { type: Date, default: Date.now },
                changedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model('Signalement', signalementSchema);