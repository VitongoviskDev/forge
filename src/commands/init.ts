import fs from "fs-extra";
import path from "path";
import readline from "readline";
import { execSync } from "child_process";
import { fileExists, readJson, writeFileSafe } from "../utils/file.js";
import { loadTemplate } from "../utils/template.js";

const CONFIG_NAME = ".forge.json";

type ForgeConfig = {
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

// 🔹 prompt simples
function askUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function initCommand(options: { overwrite?: boolean }) {
  const cwd = process.cwd();
  const configPath = path.join(cwd, CONFIG_NAME);

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

    const answer = await askUser("\nDeseja instalar automaticamente? (Y/N): ");

    if (answer.toLowerCase() !== "y") {
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

  // 🧠 escolher estrutura
  const structureAnswer = await askUser(
    "\nQual estrutura deseja usar?\n1 - Por camada\n2 - Por módulo\nEscolha (1/2): "
  );

  let config: ForgeConfig;

  if (structureAnswer === "2") {
    config = {
      structure: "module",
      paths: {
        api: "",
        service: "",
        types: "",
        hooks: "",
      },
      modulePath: "src/modules",
      apiFile: "src/api/api-client.ts",
    };
  } else {
    config = {
      structure: "layer",
      paths: {
        api: "src/api",
        service: "src/services",
        types: "src/types",
        hooks: "src/hooks",
      },
      modulePath: "",
      apiFile: "src/api/api-client.ts",
    };
  }

  // 💾 salvar config
  await fs.writeJSON(configPath, config, { spaces: 2 });

  // =====================================================
  // 📡 API CLIENT
  // =====================================================

  let apiClientPath = "";
  let apiTypesPath = "";

  if (config.structure === "module") {
    apiClientPath = path.join(cwd, "src/modules/api/api-client.ts");
    apiTypesPath = path.join(cwd, "src/modules/api/api.types.ts");
  } else {
    apiClientPath = path.join(cwd, "src/api/api-client.ts");
    apiTypesPath = path.join(cwd, "src/types/api.types.ts");
  }

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