import { makeTypeCommand } from "./make-type.js";
import { makeApiCommand } from "./make-api.js";
import { makeServiceCommand } from "./make-service.js";
import { toPascalCase } from "../utils/string.js";
import { 
    ensureForgeData, 
    saveData, 
    ensureForgeInitialized 
} from "../utils/config.js";
import { syncCommand } from "./sync.js";

export async function makeResourceCommand(
    name: string,
    options: { sync?: boolean }
) {
    const config = ensureForgeInitialized();
    const pascal = toPascalCase(name);

    console.log(`\n🚀 Creating resource: ${pascal}\n`);

    try {
        // 1. Registrar intenção no DATA
        const data = ensureForgeData();
        const exists = data.resources.find(r => r.name === name);

        if (!exists) {
            data.resources.push({
                name: name,
                methods: []
            });
            await saveData(data);
        }

        // 2. Gerar arquivos físicos
        // TYPE (domínio)
        console.log("📦 Creating type...");
        await makeTypeCommand(name, { timestamps: true });

        // API
        console.log("🌐 Creating api...");
        await makeApiCommand(name);

        // SERVICE
        console.log("⚙️ Creating service...");
        await makeServiceCommand(name);

        console.log(`\n✅ Resource ${pascal} created successfully!\n`);

        // 3. Sync
        const shouldSync = options.sync !== false && (config.sync.mode === "auto" || options.sync === true);
        
        if (shouldSync) {
            await syncCommand();
        }

    } catch (err) {
        console.error("❌ Error creating resource:", err);
        process.exit(1);
    }
}