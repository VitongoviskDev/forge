import fs from "fs-extra";
import path from "path";
import { loadTemplate } from "../utils/template.js";
import { toPascalCase, toCamelCase } from "../utils/string.js";
import { writeFileSafe } from "../utils/file.js";

export interface TypeScaffoldOptions {
    moduleName: string;
    moduleDir: string;
    timestamps?: boolean;
}

export interface ContractGeneratorOptions {
    moduleName: string;
    functionName: string;
    method: string;
    contractsDir: string;
    modelExists: boolean;
}

/**
 * Gera o arquivo <module>.types.ts com a interface base do modelo
 */
export async function generateTypeScaffold(options: TypeScaffoldOptions): Promise<void> {
    const { moduleName, moduleDir, timestamps = true } = options;

    const pascalName = toPascalCase(moduleName);
    const camelName = toCamelCase(moduleName);

    await fs.ensureDir(moduleDir);

    const filePath = path.join(moduleDir, `${camelName}.types.ts`);

    if (fs.existsSync(filePath)) {
        console.log("⚠️  Types já existe.");
        return;
    }

    const template = loadTemplate("model-type.tpl");

    let fields = `  id: string;`;
    if (timestamps) {
        fields += `\n  created_at: string;\n  updated_at: string;`;
    }

    const content = template
        .replace(/{{PascalName}}/g, pascalName)
        .replace(/{{fields}}/g, fields);

    await writeFileSafe(filePath, content);
    console.log(`📦 ${pascalName} types gerado.`);
}

/**
 * Gera o arquivo de contrato por operação (ex: createUser.types.ts)
 * na pasta contracts/ do módulo
 */
export async function generateContract(options: ContractGeneratorOptions): Promise<void> {
    const { moduleName, functionName, method, contractsDir, modelExists } = options;

    const resourcePascal = toPascalCase(moduleName);
    const actionPascal = toPascalCase(functionName);
    const actionCamel = toCamelCase(functionName);

    await fs.ensureDir(contractsDir);

    const filePath = path.join(contractsDir, `${actionCamel}.types.ts`);

    const errorMaps: Record<string, string> = {
        GET: "    403: ForbiddenError;\n    404: NotFoundError;",
        POST: "    403: ForbiddenError;\n    422: ${ActionPascal}ValidationError;",
        PUT: "    403: ForbiddenError;\n    404: NotFoundError;\n    422: ${ActionPascal}ValidationError;",
        DELETE: "    403: ForbiddenError;\n    404: NotFoundError;",
    };

    const valErrTpl = modelExists
        ? `export interface \${ActionPascal}ValidationError extends BaseError {\n  errors: TFieldValidationError<keyof \${ModelName}>[];\n}`
        : "";

    let payloadStr = "";
    if (method === "PUT" || method === "DELETE") {
        payloadStr = `  params: { id: string };\n  body: Partial<\${ModelName}>;`;
    } else if (method === "POST") {
        payloadStr = `  body: Partial<\${ModelName}>;`;
    } else {
        payloadStr = `  params?: { id?: string };`;
    }

    const modelName = modelExists ? resourcePascal : "any";
    const modelImport = modelExists
        ? `import { ${resourcePascal} } from "../${moduleName}.types";`
        : "";

    let typesContent = loadTemplate("operation-types.tpl");

    typesContent = typesContent
        .replace(/{{ActionPascal}}/g, actionPascal)
        .replace(/{{ModelName}}/g, modelName)
        .replace(/{{ModelImport}}/g, modelImport)
        .replace(
            /{{ValidationErrorInterface}}/g,
            (method === "POST" || method === "PUT") && modelExists
                ? valErrTpl
                    .replace(/\${ActionPascal}/g, actionPascal)
                    .replace(/\${ModelName}/g, resourcePascal)
                : ""
        )
        .replace(/{{PayloadStructure}}/g, payloadStr.replace(/\${ModelName}/g, modelName))
        .replace(/{{ResponseStructure}}/g, `  ${toCamelCase(moduleName)}: ${modelName}`)
        .replace(
            /{{ErrorMapStructure}}/g,
            errorMaps[method].replace(/\${ActionPascal}/g, actionPascal)
        );

    await writeFileSafe(filePath, typesContent);
    console.log(`📦 Contrato contracts/${actionCamel}.types.ts gerado.`);
}
