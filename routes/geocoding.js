// routes/geocoding.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

// GEOCODAGE AVANT (search)
router.get('/api/geocode', async (req, res) => {
    try {
        const { adresse = '', ville = '', codePostal = '' } = req.query;

        const q = [adresse, codePostal, ville]
            .filter(Boolean)
            .join(' ')
            .trim();

        if (!q || q.length < 3) {
            return res.status(400).json({
                ok: false,
                message: "Paramètres adresse / ville / codePostal insuffisants.",
            });
        }

        const ignResponse = await axios.get('https://data.geopf.fr/geocodage/search', {
            params: {
                q,
                limit: 1,
            },
            timeout: 5000,
        });

        const body = ignResponse.data;

        if (!body || !Array.isArray(body.features) || body.features.length === 0) {
            return res.json({
                ok: false,
                message: "Aucun résultat trouvé pour cette adresse.",
            });
        }

        const feature = body.features[0];
        const [lon, lat] = feature.geometry.coordinates;
        const props = feature.properties || {};

        const numero = props.housenumber || props.numero || props.num || null;

        return res.json({
            ok: true,
            lat,
            lon,
            label: props.label || q,
            voie: props.street || props.voie || null,
            commune: props.city || props.commune || null,
            numero,
            postcode: props.postcode || null,
        });
    } catch (err) {
        console.error('Erreur appel API IGN /search :', err.response?.data || err.message);
        return res.status(500).json({
            ok: false,
            message: "Erreur lors de l’appel au service de géocodage.",
        });
    }
});

// REVERSE GEOCODING (GPS → adresse)
router.get('/api/reverse-geocode', async (req, res) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({
                ok: false,
                message: "Paramètres lat / lon manquants",
            });
        }

        const ignResponse = await axios.get('https://data.geopf.fr/geocodage/reverse', {
            params: {
                lat,
                lon,
                limit: 1,
            },
            timeout: 4000,
        });

        const body = ignResponse.data;

        if (!body || !Array.isArray(body.features) || body.features.length === 0) {
            return res.json({
                ok: false,
                message: "Aucune adresse trouvée pour cette position.",
            });
        }

        const feature = body.features[0];
        const [lonRes, latRes] = feature.geometry.coordinates;
        const props = feature.properties || {};
        const numero = props.housenumber || props.numero || props.num || null;

        return res.json({
            ok: true,
            lat: latRes,
            lon: lonRes,
            label: props.label || null,
            voie: props.street || props.voie || null,
            commune: props.city || props.commune || null,
            postcode: props.postcode || null,
            numero,
        });
    } catch (err) {
        console.error('Erreur appel API IGN /reverse :', err.response?.data || err.message);
        return res.status(500).json({
            ok: false,
            message: "Erreur lors de l’appel au reverse geocoding.",
        });
    }
});

module.exports = router;
