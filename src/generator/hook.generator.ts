import path from "path";
import { loadTemplate } from "../utils/template.js";
import { toPascalCase, toCamelCase } from "../utils/string.js";
import { writeFileSafe } from "../utils/file.js";

export interface HookGeneratorOptions {
    moduleName: string;
    functionName: string;
    method: string;
    hooksDir: string;
    contractsDir: string;
}

/**
 * Gera um hook TanStack Query para a operação
 * - useMutation para POST, PUT, DELETE
 * - useQuery para GET
 */
export async function generateHook(options: HookGeneratorOptions): Promise<void> {
    const { moduleName, functionName, method, hooksDir, contractsDir } = options;

    const resourcePascal = toPascalCase(moduleName);
    const actionPascal = toPascalCase(functionName);
    const actionCamel = toCamelCase(functionName);
    const isMutation = method !== "GET";

    const relativeContractsPath = path
        .relative(hooksDir, path.join(contractsDir, actionCamel))
        .replace(/\\/g, "/");

    const relativeServicePath = path
        .relative(hooksDir, path.join(path.dirname(hooksDir), `${toCamelCase(moduleName)}.service`))
        .replace(/\\/g, "/");

    let hookContent = loadTemplate("operation-hook.tpl");

    hookContent = hookContent
        .replace(/{{HookType}}/g, isMutation ? "useMutation" : "useQuery")
        .replace(/{{HookProperty}}/g, isMutation ? "mutationFn" : "queryFn")
        .replace(/{{ActionPascal}}/g, actionPascal)
        .replace(/{{ResourcePascal}}/g, resourcePascal)
        .replace(/{{resource}}/g, relativeServicePath)
        .replace(/{{ActionPath}}/g, relativeContractsPath)
        .replace(/{{ActionCamel}}/g, actionCamel);

    const hookFilePath = path.join(hooksDir, `use${actionPascal}.hook.ts`);
    await writeFileSafe(hookFilePath, hookContent);
    console.log(`🪝  use${actionPascal} hook gerado.`);
}
