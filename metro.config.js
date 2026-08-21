const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = config.resolver;

config.resolver.assetExts = Array.from(new Set([...(assetExts || []), 'stl', 'hdr']));
config.resolver.sourceExts = (sourceExts || []).filter((ext) => ext !== 'stl' && ext !== 'hdr');

module.exports = config;
