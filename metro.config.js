const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ignorer le dossier server pour éviter les erreurs de bundling
config.resolver.blockList = [/server\/.*/];

module.exports = config;