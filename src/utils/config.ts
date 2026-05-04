import fs from "fs-extra";
import path from "path";

const CONFIG_NAME = ".forge.json";
const DATA_NAME = "forge.data.json";
const STATE_NAME = "forge.state.json";

export type ForgeConfig = {
  project: {
    architecture: "layer" | "module";
    paths: {
      api: string;
      service: string;
      types: string;
      hooks: string;
    };
    modulePath: string;
    apiFile: string;
  };
  sync: {
    mode: "auto" | "manual";
  };
};

export type ForgeData = {
  resources: Array<{
    name: string;
    methods: string[];
  }>;
};

export type ForgeState = {
  project: {
    architecture: string;
    lastSync: string;
  };
  sync: {
    mode: string;
    lastRun: string;
  };
  resources: Array<{
    name: string;
    status: "active" | "missing" | "orphan";
    files: {
      api: { exists: boolean; path: string };
      service: { exists: boolean; path: string };
      type: { exists: boolean; path: string };
      hooks: { exists: boolean; path: string };
    };
    methods: Record<string, { status: "active" | "missing"; inSync: boolean }>;
  }>;
};

export function getConfigPath() {
  return path.join(process.cwd(), CONFIG_NAME);
}

export function getDataPath() {
  return path.join(process.cwd(), DATA_NAME);
}

export function getStatePath() {
  return path.join(process.cwd(), STATE_NAME);
}

export function ensureForgeInitialized(): ForgeConfig {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    console.error("❌ Forge não foi inicializado. Rode 'forge init'.");
    process.exit(1);
  }
  return fs.readJSONSync(configPath);
}

export function ensureForgeData(): ForgeData {
  const dataPath = getDataPath();
  if (!fs.existsSync(dataPath)) {
    return { resources: [] };
  }
  return fs.readJSONSync(dataPath);
}

export function ensureForgeState(): ForgeState {
  const statePath = getStatePath();
  if (!fs.existsSync(statePath)) {
    return {
      project: { architecture: "", lastSync: "" },
      sync: { mode: "", lastRun: "" },
      resources: [],
    };
  }
  return fs.readJSONSync(statePath);
}

export async function saveConfig(config: ForgeConfig) {
  await fs.writeJSON(getConfigPath(), config, { spaces: 2 });
}

export async function saveData(data: ForgeData) {
  await fs.writeJSON(getDataPath(), data, { spaces: 2 });
}

export async function saveState(state: ForgeState) {
  await fs.writeJSON(getStatePath(), state, { spaces: 2 });
}