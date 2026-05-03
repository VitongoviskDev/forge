import fs from "fs-extra";
import path from "path";
import { loadTemplate } from "../utils/template.js";
import { toPascalCase, toCamelCase } from "../utils/string.js";
import { ensureForgeInitialized } from "../utils/config.js";
import { writeFileSafe } from "../utils/file.js";

export async function makeApiCommand(name: string) {
  const cwd = process.cwd();
  
  const config = ensureForgeInitialized();

  const pascalName = toPascalCase(name);
  const camelName = toCamelCase(name);

  let filePath = "";
  let apiImportPath = "";

  if (config.structure === "layer") {
    filePath = path.join(cwd, config.paths.api, `${camelName}.api.ts`);
    apiImportPath = "./api-client";
  } else {
    const moduleDir = path.join(cwd, config.modulePath, camelName);
    await fs.ensureDir(moduleDir);

    filePath = path.join(moduleDir, `${camelName}.api.ts`);
    apiImportPath = "@/api/api-client";
  }

  if (fs.existsSync(filePath)) {
    console.log("⚠️ API já existe.");
    return;
  }

  const templateRaw = loadTemplate("api.tpl");

  const content = templateRaw
    .replace(/{{PascalName}}/g, pascalName)
    .replace(/{{camelName}}/g, camelName)
    .replace(/{{apiImportPath}}/g, apiImportPath);

  await writeFileSafe(filePath, content);

  console.log(`✅ ${pascalName}API criada com sucesso.`);
}