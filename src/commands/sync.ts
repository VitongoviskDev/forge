import fs from "fs-extra";
import path from "path";
import { 
  ensureForgeInitialized, 
  ensureForgeData, 
  ensureForgeState, 
  saveState 
} from "../utils/config.js";
import { fileExists } from "../utils/file.js";

export async function syncCommand() {
  console.log("🔄 Sincronizando projeto...");

  const config = ensureForgeInitialized();
  const data = ensureForgeData();
  const state = ensureForgeState();

  const cwd = process.cwd();

  // 1. Atualizar metadados do projeto no state
  state.project.architecture = config.project.architecture;
  state.project.lastSync = new Date().toISOString();
  state.sync.mode = config.sync.mode;
  state.sync.lastRun = new Date().toISOString();

  const observedResources: typeof state.resources = [];

  // 2. Processar recursos registrados no DATA (Intenção)
  for (const intendedResource of data.resources) {
    const name = intendedResource.name;
    let resourcePath = "";

    if (config.project.architecture === "module") {
      resourcePath = path.join(config.project.modulePath, name);
    }

    const files = {
      api: { exists: false, path: "" },
      service: { exists: false, path: "" },
      type: { exists: false, path: "" },
      hooks: { exists: false, path: "" }
    };

    // Determinar caminhos dos arquivos baseados na arquitetura
    if (config.project.architecture === "module") {
      files.api.path = path.join(resourcePath, `${name}.api.ts`);
      files.service.path = path.join(resourcePath, `${name}.service.ts`);
      files.type.path = path.join(resourcePath, `${name}.type.ts`);
      files.hooks.path = path.join(resourcePath, `${name}.hooks.ts`);
    } else {
      files.api.path = path.join(config.project.paths.api, `${name}.api.ts`);
      files.service.path = path.join(config.project.paths.service, `${name}.service.ts`);
      files.type.path = path.join(config.project.paths.types, `${name}.type.ts`);
      files.hooks.path = path.join(config.project.paths.hooks, `${name}.hooks.ts`);
    }

    // Checar existência física
    files.api.exists = fileExists(path.join(cwd, files.api.path));
    files.service.exists = fileExists(path.join(cwd, files.service.path));
    files.type.exists = fileExists(path.join(cwd, files.type.path));
    files.hooks.exists = fileExists(path.join(cwd, files.hooks.path));

    const isMissingCritical = !files.api.exists || !files.service.exists;
    const status = isMissingCritical ? "missing" : "active";

    observedResources.push({
      name,
      status,
      files,
      methods: {} // TODO: Implementar scan de métodos no futuro
    });
  }

  // 3. Detectar recursos órfãos (existem no disco mas não no data.json)
  // TODO: Implementar scan de diretórios para detectar recursos não registrados

  state.resources = observedResources;

  await saveState(state);

  console.log("\n✅ Sync finalizado!");
  
  // Relatório rápido
  const missing = state.resources.filter(r => r.status === "missing");
  if (missing.length > 0) {
    console.log(`\n⚠️  ${missing.length} recursos com arquivos faltando:`);
    missing.forEach(r => console.log(`   - ${r.name}`));
  }
}
