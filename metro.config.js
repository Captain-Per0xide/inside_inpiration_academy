const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure environment variables are available at build time
config.resolver.platforms = ["ios", "android", "native", "web"];

module.exports = config;
