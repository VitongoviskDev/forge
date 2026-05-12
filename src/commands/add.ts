import fs from "fs-extra";
import path from "path";
import {
    ensureForgeInitialized,
    ensureForgeData,
    saveData,
    ensureForgeState,
} from "../utils/config.js";
import { toPascalCase, toCamelCase } from "../utils/string.js";
import { syncCommand } from "./sync.js";
import { injectApiMethod } from "../generator/api.generator.js";
import { injectServiceMethod } from "../generator/service.generator.js";
import { generateContract } from "../generator/types.generator.js";
import { generateHook } from "../generator/hook.generator.js";
import { select } from "../utils/prompt.js";

export async function addCommand(
    module: string,
    functionName: string,
    options: { get?: boolean; post?: boolean; put?: boolean; delete?: boolean }
) {
    // 1. Resolver o método HTTP
    let method = "";
    if (options.get) method = "GET";
    else if (options.post) method = "POST";
    else if (options.put) method = "PUT";
    else if (options.delete) method = "DELETE";

    if (!method) {
        method = await select(
            "Select request method:",
            { "1": "GET", "2": "POST", "3": "PUT", "4": "DELETE" },
            "GET"
        );
    }

    const config = ensureForgeInitialized();
    const data = ensureForgeData();
    const state = ensureForgeState();

    const cwd = process.cwd();
    const actionPascal = toPascalCase(functionName);
    const actionCamel = toCamelCase(functionName);
    const resource = module;
    const resourcePascal = toPascalCase(resource);

    console.log(`\n🚀 Adicionando: ${method} ${functionName} → ${resource}\n`);

    // 2. Auto-Healing de Orfãos
    let resourceIntent = data.resources.find(r => r.name === resource);
    if (!resourceIntent) {
        console.log(`\n👻 Módulo "${resource}" estava órfão. Registrando automaticamente...`);
        resourceIntent = { name: resource, methods: [] };
        data.resources.push(resourceIntent);
        await saveData(data);
    }

    const resourceState = state.resources.find(r => r.name === resource);
    if (!resourceState || resourceState.status === "missing") {
        console.error(`❌ Módulo "${resource}" está incompleto ou ausente no filesystem.`);
        process.exit(1);
    }

    // 3. Montar caminhos
    const apiFilePath = path.join(cwd, resourceState.files.api.path);
    const serviceFilePath = path.join(cwd, resourceState.files.service.path);
    const moduleDir = path.dirname(apiFilePath);
    const contractsDir = path.join(moduleDir, "contracts");
    const hooksDir = path.join(moduleDir, "hooks");

    await fs.ensureDir(contractsDir);
    await fs.ensureDir(hooksDir);

    // 4. Delegar geração para os generators
    const modelExists = resourceState.files.type?.exists ?? false;

    await generateContract({
        moduleName: resource,
        functionName,
        method,
        contractsDir,
        modelExists,
    });

    await injectApiMethod({
        moduleName: resource,
        functionName,
        method,
        apiFilePath,
        contractsDir,
    });

    await injectServiceMethod({
        moduleName: resource,
        functionName,
        serviceFilePath,
        contractsDir,
    });

    await generateHook({
        moduleName: resource,
        functionName,
        method,
        hooksDir,
        contractsDir,
    });

    // 5. Atualizar registry
    if (!resourceIntent.methods.includes(actionCamel)) {
        resourceIntent.methods.push(actionCamel);
        await saveData(data);
    }

    // 6. Sync
    await syncCommand();

    console.log(`\n✅ ${functionName} adicionado com sucesso ao módulo ${resourcePascal}!`);
}
