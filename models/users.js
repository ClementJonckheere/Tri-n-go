const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: { type: String, required: true },
        name: { type: String, required: true },

        role: {
            type: String,
            enum: ['citoyen', 'agent', 'chef_agent', 'gestionnaire'],
            default: 'citoyen',
        },
        adresse: { type: String, maxLength: 200 },
        ville: { type: String, maxLength: 100 },
        codePostal: {
            type: String,
            match: /^[0-9]{5}$/,
        },
        perimetreVille: { type: String },
        chefAgent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },

        pointsTotal: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },

        cashbackUsedTotal: { type: Number, default: 0 },   // total € utilisés
        decheterieAccountNumber: { type: String, default: null },
    },
    { timestamps: true }
);

userSchema.methods.setPassword = async function (password) {
    const saltRounds = 10;
    this.passwordHash = await bcrypt.hash(password, saltRounds);
};

userSchema.methods.verifyPassword = async function (password) {
    return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
