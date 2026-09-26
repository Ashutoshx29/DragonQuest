const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// ── expo-sqlite web (WASM) ──────────────────────────────────────────────────
// expo-sqlite's web implementation imports wa-sqlite.wasm. Without this,
// Metro cannot resolve the .wasm asset and web bundling fails.
config.resolver.assetExts.push('wasm');

// ── drizzle SQL migrations ──────────────────────────────────────────────────
// SQL files are imported as strings (babel-plugin-inline-import) so the
// generated drizzle migrations bundle into the app.
config.resolver.sourceExts.push('sql');

module.exports = config;
