const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { resolve } = require("metro-resolver");

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // On web, force react-native-maps to a safe shim.
  if (platform === "web" && moduleName === "react-native-maps") {
    const shimPath = path.resolve(__dirname, "shims/react-native-maps.web.tsx");
    return resolve(context, shimPath, platform);
  }

  // Default resolver for everything else.
  return resolve(context, moduleName, platform);
};

module.exports = config;
