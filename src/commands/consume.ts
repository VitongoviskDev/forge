import fs from "fs-extra";
import path from "path";
import readline from "readline";
import { Project, SyntaxKind, ObjectLiteralExpression } from "ts-morph";
import {
    ensureForgeInitialized,
    ensureForgeData,
    saveData,
    ensureForgeState
} from "../utils/config.js";
import { toPascalCase, toCamelCase } from "../utils/string.js";
import { loadTemplate } from "../utils/template.js";
import { writeFileSafe, fileExists } from "../utils/file.js";
import { syncCommand } from "./sync.js";

// 🔹 prompt simples
function askUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function consumeCommand(
    method: string,
    action: string,
    resource?: string,
    apiInstance: string = "api"
) {
    const config = ensureForgeInitialized();
    const data = ensureForgeData();
    const state = ensureForgeState();

    const cwd = process.cwd();
    const actionPascal = toPascalCase(action);
    const actionCamel = toCamelCase(action);

    if (!resource) {
        if (state.resources.length === 0) {
            console.error(`❌ Nenhum resource encontrado. Crie um resource primeiro com 'forge make:resource'.`);
            process.exit(1);
        }

        const validResources = state.resources.filter(r => r.status !== "missing");
        if (validResources.length === 0) {
            console.error(`❌ Todos os resources estão incompletos ('missing'). Não é possível consumir.`);
            process.exit(1);
        }

        let question = "\nQual resource deseja usar?\n";
        validResources.forEach((r, idx) => {
            question += `${idx + 1} - ${r.name}\n`;
        });
        question += `Escolha (1-${validResources.length}): `;

        const answer = await askUser(question);
        const index = parseInt(answer.trim(), 10) - 1;

        if (isNaN(index) || index < 0 || index >= validResources.length) {
            console.error("\n❌ Opção inválida.");
            process.exit(1);
        }

        resource = validResources[index].name;
    }

    const resourcePascal = toPascalCase(resource);

    // 1. Validações e Auto-Healing de Orfãos
    let resourceIntent = data.resources.find(r => r.name === resource);
    if (!resourceIntent) {
        console.log(`\n👻 Resource "${resource}" estava órfão. Registrando intenção automaticamente...`);
        resourceIntent = { name: resource, methods: [] };
        data.resources.push(resourceIntent);
        await saveData(data);
    }

    const resourceState = state.resources.find(r => r.name === resource);
    if (!resourceState || resourceState.status === "missing") {
        console.error(`❌ Resource "${resource}" está incompleto ou ausente no filesystem.`);
        process.exit(1);
    }

    console.log(`\n🚀 Consumindo operação: ${method} ${action} em ${resource}\n`);

    const project = new Project();

    // 2. Definir caminhos e subpastas
    const apiFilePath = path.join(cwd, resourceState.files.api.path);
    const moduleDir = path.dirname(apiFilePath);
    const hooksDir = path.join(moduleDir, "hooks");
    const endpointsDir = path.join(moduleDir, "endpoints");

    await fs.ensureDir(hooksDir);
    await fs.ensureDir(endpointsDir);

    // 3. Injetar na API Layer
    const apiSource = project.addSourceFileAtPath(apiFilePath);
    const apiObject = apiSource.getVariableDeclaration(`${resourcePascal}API`)?.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);

    if (apiObject) {
        const paramsStr = (method === "PUT" || method === "DELETE" || method === "GET") ? "`${payload.params.id}`" : "";
        const bodyStr = (method === "POST" || method === "PUT") ? ", payload.body" : "";
        const urlSuffix = paramsStr ? `/${resource}/${paramsStr}` : `"/${resource}/${actionCamel}"`;

        // Adicionar import do tipo (ajustado para subpasta)
        apiSource.addImportDeclaration({
            moduleSpecifier: `./endpoints/${actionCamel}.types`,
            namedImports: [`${actionPascal}Payload`, `${actionPascal}Response`]
        });

        apiObject.addPropertyAssignment({
            name: actionCamel,
            initializer: `async (payload: ${actionPascal}Payload):Promise<${actionPascal}Response> => await ${apiInstance}.${method.toLowerCase()}<${actionPascal}Response>(${urlSuffix}${bodyStr})`
        });

        await apiSource.save();
        console.log(`🌐 API (${resource}.api.ts) atualizada.`);
    }

    // 4. Injetar na Service Layer
    const serviceFilePath = path.join(cwd, resourceState.files.service.path);
    const serviceSource = project.addSourceFileAtPath(serviceFilePath);
    const serviceObject = serviceSource.getVariableDeclaration(`${resourcePascal}Service`)?.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);

    if (serviceObject) {
        serviceSource.addImportDeclaration({
            moduleSpecifier: `./endpoints/${actionCamel}.types`,
            namedImports: [`${actionPascal}Payload`, `${actionPascal}Response`]
        });

        serviceObject.addPropertyAssignment({
            name: actionCamel,
            initializer: `async (payload: ${actionPascal}Payload):Promise<${actionPascal}Response> => {
    try {
      const { data } = await ${resourcePascal}API.${actionCamel}(payload);
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  }`
        });

        await serviceSource.save();
        console.log(`⚙️ Service (${resource}.service.ts) atualizado.`);
    }

    // 5. Gerar Types (na subpasta endpoints)
    const typesFilePath = path.join(endpointsDir, `${actionCamel}.types.ts`);
    const modelExists = resourceState.files.type.exists;
    const modelName = resourcePascal;

    let typesContent = loadTemplate("operation-types.tpl");

    const errorMaps: Record<string, string> = {
        GET: "    403: ForbiddenError;\n    404: NotFoundError;",
        POST: "    403: ForbiddenError;\n    422: ${ActionPascal}ValidationError;",
        PUT: "    403: ForbiddenError;\n    404: NotFoundError;\n    422: ${ActionPascal}ValidationError;",
        DELETE: "    403: ForbiddenError;\n    404: NotFoundError;"
    };

    const valErrTpl = `export interface \${ActionPascal}ValidationError extends BaseError {
  errors: TFieldValidationError<keyof \${ModelName}>[];
}`;

    let payloadStr = "";
    if (method === "PUT" || method === "DELETE") {
        payloadStr = "  params: { id: string };\n  body: Partial<${ModelName}>;";
    } else if (method === "POST") {
        payloadStr = "  body: Partial<${ModelName}>;";
    } else {
        payloadStr = "  params?: { id?: string };";
    }

    typesContent = typesContent
        .replace(/{{ActionPascal}}/g, actionPascal)
        .replace(/{{ModelName}}/g, modelExists ? modelName : "any")
        .replace(/{{ModelImport}}/g, modelExists ? `import { ${modelName} } from "../${resource}.type";` : "")
        .replace(/{{ValidationErrorInterface}}/g, (method === "POST" || method === "PUT") && modelExists ? valErrTpl.replace(/\${ActionPascal}/g, actionPascal).replace(/\${ModelName}/g, modelName) : "")
        .replace(/{{PayloadStructure}}/g, payloadStr.replace(/\${ModelName}/g, modelExists ? modelName : "any"))
        .replace(/{{ResponseStructure}}/g, `  ${toCamelCase(resource)}: ${modelExists ? modelName : "any"}`)
        .replace(/{{ErrorMapStructure}}/g, errorMaps[method].replace(/\${ActionPascal}/g, actionPascal));

    await writeFileSafe(typesFilePath, typesContent);
    console.log(`📦 Types (endpoints/${actionCamel}.types.ts) gerado.`);

    // 6. Gerar Hook (na subpasta hooks)
    const hookFilePath = path.join(hooksDir, `use${actionPascal}.hook.ts`);
    let hookContent = loadTemplate("operation-hook.tpl");

    const isMutation = method !== "GET";

    hookContent = hookContent
        .replace(/{{HookType}}/g, isMutation ? "useMutation" : "useQuery")
        .replace(/{{HookProperty}}/g, isMutation ? "mutationFn" : "queryFn")
        .replace(/{{ActionPascal}}/g, actionPascal)
        .replace(/{{ResourcePascal}}/g, resourcePascal)
        .replace(/{{resource}}/g, `../${resource}`)
        .replace(/{{ActionPath}}/g, `../endpoints/${actionCamel}`)
        .replace(/{{ActionCamel}}/g, actionCamel);

    await writeFileSafe(hookFilePath, hookContent);
    console.log(`🪝 Hook (hooks/use${actionPascal}.hook.ts) gerado.`);

    // 6. Atualizar Registry
    if (!resourceIntent.methods.includes(actionCamel)) {
        resourceIntent.methods.push(actionCamel);
        // TODO: Adicionar metadados detalhados de operação se necessário
        await saveData(data);
    }

    // 7. Sync
    await syncCommand();

    console.log(`\n✅ Operação ${actionCamel} injetada com sucesso!`);
}
