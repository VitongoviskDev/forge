import fs from "fs-extra";
import path from "path";
import { loadTemplate } from "../utils/template.js";
import { toPascalCase, toCamelCase } from "../utils/string.js";
import { ensureForgeInitialized, ensureForgeData, saveData } from "../utils/config.js";
import { writeFileSafe } from "../utils/file.js";
import { syncCommand } from "./sync.js";

export async function makeServiceCommand(name: string) {
  const config = ensureForgeInitialized();

  const cwd = process.cwd();

  const pascalName = toPascalCase(name);
  const camelName = toCamelCase(name);

  let filePath = "";
  let apiImportPath = "";
  let utilsImportPath = "@/utils/api.utils";

  if (config.project.architecture === "layer") {
    filePath = path.join(cwd, config.project.paths.service, `${camelName}.service.ts`);
    apiImportPath = `@/api/${camelName}.api`;
  } else {
    const moduleDir = path.join(cwd, config.project.modulePath, camelName);
    await fs.ensureDir(moduleDir);

    filePath = path.join(moduleDir, `${camelName}.service.ts`);
    apiImportPath = `./${camelName}.api`;
  }

  if (fs.existsSync(filePath)) {
    console.log("⚠️ Service já existe.");
    return;
  }

  const templateRaw = loadTemplate("service.tpl");

  const content = templateRaw
    .replace(/{{PascalName}}/g, pascalName)
    .replace(/{{apiImportPath}}/g, apiImportPath)
    .replace(/{{utilsImportPath}}/g, utilsImportPath);

  await writeFileSafe(filePath, content);

  console.log(`✅ ${pascalName}Service criado com sucesso.`);

  const data = ensureForgeData();
  if (!data.resources.find((r) => r.name === name)) {
    data.resources.push({ name, methods: [] });
    await saveData(data);
  }

  if (config.sync.mode === "auto") {
    await syncCommand();
  }
}