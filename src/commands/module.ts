import path from "path";
import { toPascalCase, toCamelCase } from "../utils/string.js";
import { ensureForgeData, saveData, ensureForgeInitialized } from "../utils/config.js";
import { syncCommand } from "./sync.js";
import { generateTypeScaffold } from "../generator/types.generator.js";
import { generateApiScaffold } from "../generator/api.generator.js";
import { generateServiceScaffold } from "../generator/service.generator.js";

export async function moduleCommand(
    name: string,
    options: { sync?: boolean; minimal?: boolean }
) {
    const config = ensureForgeInitialized();
    const pascal = toPascalCase(name);
    const camel = toCamelCase(name);
    const cwd = process.cwd();
    const moduleDir = path.join(cwd, config.project.modulePath, camel);

    console.log(`\n🚀 Creating module: ${pascal}\n`);

    try {
        // 1. Registrar intenção no DATA
        const data = ensureForgeData();
        const exists = data.resources.find(r => r.name === name);

        if (!exists) {
            data.resources.push({ name, methods: [] });
            await saveData(data);
        }

        // 2. Gerar arquivos via generators
        if (!options.minimal) {
            await generateTypeScaffold({ moduleName: name, moduleDir, timestamps: true });
        } else {
            console.log("📦 Skipping type creation (--minimal)");
        }

        await generateApiScaffold({ moduleName: name, moduleDir });
        await generateServiceScaffold({ moduleName: name, moduleDir });

        console.log(`\n✅ Module ${pascal} created successfully!\n`);

        // 3. Sync
        const shouldSync = options.sync !== false && (config.sync.mode === "auto" || options.sync === true);
        if (shouldSync) {
            await syncCommand();
        }

    } catch (err) {
        console.error("❌ Error creating module:", err);
        process.exit(1);
    }
}