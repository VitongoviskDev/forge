import fs from "fs-extra";
import path from "path";
import { loadTemplate } from "../utils/template.js";
import { toCamelCase, toUpperSnake } from "../utils/string.js";
import { ensureForgeInitialized } from "../utils/config.js";
import { writeFileSafe } from "../utils/file.js";

export async function makeClientCommand(
  name: string,
  options: { overwrite?: boolean }
) {
  const cwd = process.cwd();

  const config = ensureForgeInitialized();

  const apiClientPath = path.join(cwd, config.apiFile);

  if (!fs.existsSync(apiClientPath)) {
    console.error("❌ api-client.ts não encontrado.");
    process.exit(1);
  }

  const camelName = toCamelCase(name);
  const upperName = toUpperSnake(name);

  const fileContent = await fs.readFile(apiClientPath, "utf-8");

  const alreadyExists = fileContent.includes(
    `export const ${camelName}Api`
  );

  if (alreadyExists && !options.overwrite) {
    console.log(
      `⚠️ ${camelName}Api já existe. Use --overwrite para recriar.`
    );
    return;
  }

  const templateRaw = loadTemplate("api-client-instance.tpl");

  const template = templateRaw
    .replace(/{{camelName}}/g, camelName)
    .replace(/{{upperName}}/g, upperName);

  let newContent = fileContent;

  if (alreadyExists) {
    // 🔥 sobrescrever (simples: remove bloco antigo)
    const regex = new RegExp(
      `export const ${camelName}Api[\\s\\S]*?setupInterceptors\\(${camelName}Api.*?\\);`,
      "g"
    );

    newContent = newContent.replace(regex, template);
  } else {
    // adiciona no final
    newContent += `\n\n${template}\n`;
  }
  await writeFileSafe(apiClientPath, newContent);

  console.log(
    alreadyExists
      ? `♻️ ${camelName}Api sobrescrito.`
      : `✅ ${camelName}Api criado.`
  );
}