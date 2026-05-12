import fs from "fs-extra";
import path from "path";
import { Project, SyntaxKind } from "ts-morph";
import { loadTemplate } from "../utils/template.js";
import { toPascalCase, toCamelCase } from "../utils/string.js";
import { writeFileSafe } from "../utils/file.js";

export interface ApiGeneratorOptions {
    moduleName: string;
    moduleDir: string;
    apiImportPath?: string;
}

export interface InjectApiMethodOptions {
    moduleName: string;
    functionName: string;
    method: string;
    apiFilePath: string;
    contractsDir: string;
    apiInstance?: string;
}

/**
 * Gera o arquivo <module>.api.ts vazio (scaffold inicial do módulo)
 */
export async function generateApiScaffold(options: ApiGeneratorOptions): Promise<void> {
    const { moduleName, moduleDir, apiImportPath = "@/api/api-client" } = options;

    const pascalName = toPascalCase(moduleName);
    const camelName = toCamelCase(moduleName);

    await fs.ensureDir(moduleDir);

    const filePath = path.join(moduleDir, `${camelName}.api.ts`);

    if (fs.existsSync(filePath)) {
        console.log("⚠️  API já existe.");
        return;
    }

    const templateRaw = loadTemplate("api.tpl");
    const content = templateRaw
        .replace(/{{PascalName}}/g, pascalName)
        .replace(/{{camelName}}/g, camelName)
        .replace(/{{apiImportPath}}/g, apiImportPath);

    await writeFileSafe(filePath, content);
    console.log(`🌐 ${pascalName}API gerada.`);
}

/**
 * Injeta um novo método no objeto <Module>API via AST (ts-morph)
 */
export async function injectApiMethod(options: InjectApiMethodOptions): Promise<void> {
    const {
        moduleName,
        functionName,
        method,
        apiFilePath,
        contractsDir,
        apiInstance = "api",
    } = options;

    const resourcePascal = toPascalCase(moduleName);
    const actionPascal = toPascalCase(functionName);
    const actionCamel = toCamelCase(functionName);

    const project = new Project();
    const apiSource = project.addSourceFileAtPath(apiFilePath);
    const apiObject = apiSource
        .getVariableDeclaration(`${resourcePascal}API`)
        ?.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);

    if (!apiObject) {
        console.warn(`⚠️  Objeto ${resourcePascal}API não encontrado em ${apiFilePath}`);
        return;
    }

    const paramsStr =
        method === "PUT" || method === "DELETE" || method === "GET"
            ? "`${payload.params.id}`"
            : "";
    const bodyStr = method === "POST" || method === "PUT" ? ", payload.body" : "";
    const urlSuffix = paramsStr
        ? `/${moduleName}/${paramsStr}`
        : `"/${moduleName}/${actionCamel}"`;

    const relativeContractsPath = path
        .relative(path.dirname(apiFilePath), path.join(contractsDir, `${actionCamel}.types`))
        .replace(/\\/g, "/");

    apiSource.addImportDeclaration({
        moduleSpecifier: `./${relativeContractsPath}`,
        namedImports: [
            `type ${actionPascal}Payload`,
            `type ${actionPascal}Response`,
        ],
    });

    apiObject.addPropertyAssignment({
        name: actionCamel,
        initializer: `async (payload: ${actionPascal}Payload): Promise<${actionPascal}Response> => await ${apiInstance}.${method.toLowerCase()}<${actionPascal}Response>(${urlSuffix}${bodyStr})`,
    });

    await apiSource.save();
    console.log(`🌐 ${actionCamel} injetado em ${moduleName}.api.ts`);
}
