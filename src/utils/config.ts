import fs from "fs-extra";
import path from "path";

const CONFIG_NAME = ".forge.json";
const DATA_NAME = "forge.data.json";
const STATE_NAME = "forge.state.json";

export type ForgeConfig = {
  project: {
    architecture: "module";
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

export type ForgeFileEntry = {
  exists: boolean;
  path: string;
};

export type ForgeResourceState = {
  name: string;
  status: "active" | "missing" | "orphan";
  files: {
    api: ForgeFileEntry;
    service: ForgeFileEntry;
    types: ForgeFileEntry;      // arquivo <module>.types.ts (interface base do modelo)
    contracts: ForgeFileEntry;  // pasta contracts/ (ex: createUser.types.ts)
    hooks: ForgeFileEntry;      // pasta hooks/ (ex: useCreateUser.hook.ts)
  };
  methods: Record<string, { status: "active" | "missing"; inSync: boolean }>;
};

export type ForgeState = {
  project: {
    architecture: "module";
    lastSync: string;
  };
  sync: {
    mode: string;
    lastRun: string;
  };
  resources: ForgeResourceState[];
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
      project: { architecture: "module", lastSync: "" },
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