import fs from "fs-extra";
import path from "path";
import { loadTemplate } from "../utils/template.js";
import { toPascalCase, toCamelCase } from "../utils/string.js";
import { ensureForgeInitialized } from "../utils/config.js";
import { writeFileSafe } from "../utils/file.js";

export async function makeTypeCommand(
    name: string,
    options: { timestamps?: boolean }
) {
    const config = ensureForgeInitialized();
    const cwd = process.cwd();

    const pascalName = toPascalCase(name);
    const camelName = toCamelCase(name);

    let filePath = "";

    if (config.project.architecture === "layer") {
        filePath = path.join(cwd, config.project.paths.types, `${camelName}.type.ts`);
    } else {
        const moduleDir = path.join(cwd, config.project.modulePath, camelName);
        await fs.ensureDir(moduleDir);

        filePath = path.join(moduleDir, `${camelName}.type.ts`);
    }

    if (fs.existsSync(filePath)) {
        console.log("⚠️ Type já existe.");
        return;
    }

    const template = loadTemplate("model-type.tpl");

    let fields = `  id: string;`;

    if (!!options.timestamps) {
        fields += `\n  created_at: string;\n  updated_at: string;`;
    }

    const content = template
        .replace(/{{PascalName}}/g, pascalName)
        .replace(/{{fields}}/g, fields);

    await writeFileSafe(filePath, content);

    console.log(`✅ ${pascalName} type criado com sucesso.`);
}