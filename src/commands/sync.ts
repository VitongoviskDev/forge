import fs from "fs-extra";
import path from "path";
import {
  ensureForgeInitialized,
  ensureForgeData,
  ensureForgeState,
  saveState,
  ForgeResourceState,
} from "../utils/config.js";
import { fileExists } from "../utils/file.js";

/**
 * Resolve o estado físico dos arquivos de um módulo.
 * Verifica: api, service, types (arquivo base), contracts (pasta), hooks (pasta)
 */
function resolveModuleFiles(
  moduleName: string,
  modulePath: string,
  cwd: string
): ForgeResourceState["files"] {
  const moduleDir = path.join(cwd, modulePath, moduleName);

  const apiPath = path.join(modulePath, moduleName, `${moduleName}.api.ts`);
  const servicePath = path.join(modulePath, moduleName, `${moduleName}.service.ts`);
  const typesPath = path.join(modulePath, moduleName, `${moduleName}.types.ts`);
  const contractsPath = path.join(modulePath, moduleName, "contracts");
  const hooksPath = path.join(modulePath, moduleName, "hooks");

  return {
    api: {
      exists: fileExists(path.join(cwd, apiPath)),
      path: apiPath,
    },
    service: {
      exists: fileExists(path.join(cwd, servicePath)),
      path: servicePath,
    },
    types: {
      exists: fileExists(path.join(cwd, typesPath)),
      path: typesPath,
    },
    contracts: {
      exists: fs.existsSync(path.join(cwd, contractsPath)),
      path: contractsPath,
    },
    hooks: {
      exists: fs.existsSync(path.join(cwd, hooksPath)),
      path: hooksPath,
    },
  };
}

/**
 * Determina o status de um módulo baseado nos arquivos críticos.
 * Um módulo é "missing" se api.ts ou service.ts não existirem.
 */
function resolveModuleStatus(
  files: ForgeResourceState["files"]
): ForgeResourceState["status"] {
  if (!files.api.exists || !files.service.exists) return "missing";
  return "active";
}

export async function syncCommand() {
  console.log("🔄 Sincronizando projeto...");

  const config = ensureForgeInitialized();
  const data = ensureForgeData();
  const state = ensureForgeState();
  const cwd = process.cwd();
  const modulePath = config.project.modulePath;

  // 1. Atualizar metadados globais
  state.project.architecture = "module";
  state.project.lastSync = new Date().toISOString();
  state.sync.mode = config.sync.mode;
  state.sync.lastRun = new Date().toISOString();

  const observedResources: ForgeResourceState[] = [];
  const registeredNames = new Set<string>(data.resources.map(r => r.name));

  // 2. Processar módulos registrados no DATA (intenção)
  for (const intendedModule of data.resources) {
    const { name } = intendedModule;
    const files = resolveModuleFiles(name, modulePath, cwd);
    const status = resolveModuleStatus(files);

    // Preservar metadados de métodos existentes no state anterior
    const previousState = state.resources.find(r => r.name === name);

    observedResources.push({
      name,
      status,
      files,
      methods: previousState?.methods ?? {},
    });
  }

  // 3. Detectar módulos órfãos (existem no disco mas não no data.json)
  const moduleBaseDir = path.join(cwd, modulePath);

  if (fs.existsSync(moduleBaseDir)) {
    const dirs = fs.readdirSync(moduleBaseDir, { withFileTypes: true });

    for (const dir of dirs) {
      // Ignorar a pasta "api" (infraestrutura global) e não-diretórios
      if (!dir.isDirectory() || dir.name === "api") continue;

      const name = dir.name;
      if (registeredNames.has(name)) continue; // já processado

      const files = resolveModuleFiles(name, modulePath, cwd);

      observedResources.push({
        name,
        status: "orphan",
        files,
        methods: {},
      });
    }
  }

  state.resources = observedResources;
  await saveState(state);

  // 4. Relatório de sync
  console.log("\n✅ Sync finalizado!\n");

  const active = observedResources.filter(r => r.status === "active");
  const missing = observedResources.filter(r => r.status === "missing");
  const orphans = observedResources.filter(r => r.status === "orphan");

  console.log(`📊 Módulos: ${active.length} ativos, ${missing.length} incompletos, ${orphans.length} órfãos`);

  if (missing.length > 0) {
    console.log(`\n⚠️  Módulos com arquivos faltando:`);
    missing.forEach(r => {
      const missingFiles = Object.entries(r.files)
        .filter(([, v]) => !v.exists)
        .map(([k]) => k);
      console.log(`   - ${r.name} (faltando: ${missingFiles.join(", ")})`);
    });
  }

  if (orphans.length > 0) {
    console.log(`\n👻 Módulos órfãos detectados (existem no disco, mas não registrados):`);
    orphans.forEach(r => console.log(`   - ${r.name}`));
    console.log(`\n   💡 Dica: rode 'forge module ${orphans[0].name}' para registrá-los.`);
  }
}
