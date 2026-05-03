import fs from "fs-extra";
import path from "path";

const CONFIG_NAME = ".forge.json";

export type ForgeConfig = {
  structure: "layer" | "module";
  paths: {
    api: string;
    service: string;
    types: string;
    hooks: string;
  };
  modulePath: string;
  apiFile: string;
};

export function getConfigPath() {
  return path.join(process.cwd(), CONFIG_NAME);
}

export function ensureForgeInitialized(): ForgeConfig {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    console.error("❌ Forge não foi inicializado. Rode 'forge init'.");
    process.exit(1);
  }

  return fs.readJSONSync(configPath);
}