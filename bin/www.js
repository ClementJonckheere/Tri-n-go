#!/usr/bin/env node

const http = require('http');
const mongoose = require('mongoose');
const app = require('../app'); // app.js est à la racine du projet

// ====== PORT ======
const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

// ====== SERVEUR HTTP ======
const server = http.createServer(app);

// ====== MONGODB ======
const dbUri = 'mongodb://127.0.0.1:27017/encombrants?directConnection=true&serverSelectionTimeoutMS=2000';

(async () => {
    try {
        await mongoose.connect(dbUri);
        console.log('Connecté a MongoDB');

        server.listen(port);
        server.on('error', onError);
        server.on('listening', onListening);
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1);
    }
})();

// ====== FONCTIONS UTILITAIRES ======
function normalizePort(val) {
    const port = parseInt(val, 10);
    if (Number.isNaN(port)) return val;
    if (port >= 0) return port;
    return false;
}

function onError(error) {
    if (error.syscall !== 'listen') throw error;

    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
        default:
            throw error;
    }
}

function onListening() {
    const addr = server.address();
    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    console.log('Serveur écoute sur le port ' + bind);
}
