import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import { fileExists, readJson, writeFileSafe } from "../utils/file.js";
import { loadTemplate } from "../utils/template.js";
import {
  ForgeConfig,
  saveConfig,
  saveData,
  saveState,
  getConfigPath,
} from "../utils/config.js";
import { confirm, select } from "../utils/prompt.js";

export async function initCommand(options: { overwrite?: boolean }) {
  const cwd = process.cwd();
  const configPath = getConfigPath();

  // 🔒 já inicializado
  if (fileExists(configPath) && !options.overwrite) {
    console.log("⚠️ Forge já foi inicializado neste projeto.");
    console.log("👉 Use --overwrite para reconfigurar.\n");
    return;
  }

  if (fileExists(configPath) && options.overwrite) {
    console.log("♻️ Reconfigurando projeto Forge...\n");
  }

  // 📦 package.json
  const packagePath = path.join(cwd, "package.json");

  if (!fileExists(packagePath)) {
    console.error("❌ package.json não encontrado.");
    process.exit(1);
  }

  const pkg = readJson(packagePath);

  const hasAxios = !!pkg.dependencies?.axios;
  const hasTanstack = !!pkg.dependencies?.["@tanstack/react-query"];

  // 🔥 valida dependências
  if (!hasAxios || !hasTanstack) {
    console.log("❌ Dependências obrigatórias não encontradas:\n");

    if (!hasAxios) console.log("- axios");
    if (!hasTanstack) console.log("- @tanstack/react-query");

    console.log("\n⚠️ Essas dependências são obrigatórias para o Forge.");

    const ok = await confirm("\nDeseja instalar automaticamente? (Y/N): ");

    if (!ok) {
      console.log("\n❌ Instalação cancelada.");
      process.exit(1);
    }

    try {
      console.log("\n📦 Instalando dependências...\n");

      execSync("npm install axios @tanstack/react-query", {
        stdio: "inherit",
      });

      console.log("\n✅ Dependências instaladas!\n");
    } catch {
      console.error("\n❌ Erro ao instalar dependências.");
      process.exit(1);
    }
  }

  const syncMode = await select(
    "Qual o modo de sincronização?",
    { "1": "auto", "2": "manual" },
    "auto"
  ) as "auto" | "manual";

  let config: ForgeConfig;

  config = {
    project: {
      architecture: "module",
      modulePath: "src/modules",
      apiFile: "src/modules/api/api-client.ts",
    },
    sync: {
      mode: syncMode,
    },
  };

  // 💾 salvar config
  await saveConfig(config);

  // 💾 inicializar data.json (Intenção)
  await saveData({ resources: [] });

  // 💾 inicializar state.json (Realidade)
  await saveState({
    project: {
      architecture: config.project.architecture,
      lastSync: new Date().toISOString(),
    },
    sync: {
      mode: config.sync.mode,
      lastRun: "",
    },
    resources: [],
  });

  // =====================================================
  // 📡 API CLIENT
  // =====================================================

  const apiClientPath = path.join(cwd, "src/modules/api/api-client.ts");
  const apiTypesPath = path.join(cwd, "src/modules/api/api.types.ts");

  if (fileExists(apiClientPath) && !options.overwrite) {
    console.log("ℹ️ api-client.ts já existe.");
  } else {
    const template = loadTemplate("api-client.ts.tpl");

    await writeFileSafe(apiClientPath, template);

    console.log(
      fileExists(apiClientPath)
        ? "♻️ api-client.ts sobrescrito."
        : "📡 api-client.ts criado."
    );
  }

  // =====================================================
  // 📦 TYPES BASE
  // =====================================================

  const globalTypesPath = path.join(cwd, "src/types/global.types.ts");
  const sharedTypesPath = path.join(cwd, "src/types/shared.types.ts");

  const globalTemplate = loadTemplate("global.types.tpl");
  const apiTemplate = loadTemplate("api.types.tpl");
  const sharedTemplate = loadTemplate("shared.types.tpl");

  if (!fileExists(globalTypesPath) || options.overwrite) {
    await writeFileSafe(globalTypesPath, globalTemplate);
    console.log("📦 global.types criado.");
  }

  if (!fileExists(apiTypesPath) || options.overwrite) {
    await writeFileSafe(apiTypesPath, apiTemplate);
    console.log("📦 api.types criado.");
  }

  if (!fileExists(sharedTypesPath) || options.overwrite) {
    await writeFileSafe(sharedTypesPath, sharedTemplate);
    console.log("📦 shared.types criado.");
  }

  // =====================================================
  // 🧠 UTILS
  // =====================================================

  const apiUtilsPath = path.join(cwd, "src/utils/api.utils.ts");
  const apiUtilsTemplate = loadTemplate("api.utils.tpl");

  if (!fileExists(apiUtilsPath) || options.overwrite) {
    await writeFileSafe(apiUtilsPath, apiUtilsTemplate);
    console.log("🧠 api.utils criado.");
  }

  // =====================================================

  console.log("\n✅ Forge inicializado com sucesso!");
}