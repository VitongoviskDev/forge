import fs from "fs-extra";
import path from "path";
import { Project, SyntaxKind } from "ts-morph";
import { loadTemplate } from "../utils/template.js";
import { toPascalCase, toCamelCase } from "../utils/string.js";
import { writeFileSafe } from "../utils/file.js";

export interface ServiceGeneratorOptions {
    moduleName: string;
    moduleDir: string;
    apiImportPath?: string;
    utilsImportPath?: string;
}

export interface InjectServiceMethodOptions {
    moduleName: string;
    functionName: string;
    serviceFilePath: string;
    contractsDir: string;
}

/**
 * Gera o arquivo <module>.service.ts vazio (scaffold inicial do módulo)
 */
export async function generateServiceScaffold(options: ServiceGeneratorOptions): Promise<void> {
    const {
        moduleName,
        moduleDir,
        apiImportPath,
        utilsImportPath = "@/utils/api.utils",
    } = options;

    const pascalName = toPascalCase(moduleName);
    const camelName = toCamelCase(moduleName);

    await fs.ensureDir(moduleDir);

    const filePath = path.join(moduleDir, `${camelName}.service.ts`);

    if (fs.existsSync(filePath)) {
        console.log("⚠️  Service já existe.");
        return;
    }

    const resolvedApiImport = apiImportPath ?? `./${camelName}.api`;

    const templateRaw = loadTemplate("service.tpl");
    const content = templateRaw
        .replace(/{{PascalName}}/g, pascalName)
        .replace(/{{apiImportPath}}/g, resolvedApiImport)
        .replace(/{{utilsImportPath}}/g, utilsImportPath);

    await writeFileSafe(filePath, content);
    console.log(`⚙️  ${pascalName}Service gerado.`);
}

/**
 * Injeta um novo método no objeto <Module>Service via AST (ts-morph)
 */
export async function injectServiceMethod(options: InjectServiceMethodOptions): Promise<void> {
    const { moduleName, functionName, serviceFilePath, contractsDir } = options;

    const resourcePascal = toPascalCase(moduleName);
    const actionPascal = toPascalCase(functionName);
    const actionCamel = toCamelCase(functionName);

    const project = new Project();
    const serviceSource = project.addSourceFileAtPath(serviceFilePath);
    const serviceObject = serviceSource
        .getVariableDeclaration(`${resourcePascal}Service`)
        ?.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);

    if (!serviceObject) {
        console.warn(`⚠️  Objeto ${resourcePascal}Service não encontrado em ${serviceFilePath}`);
        return;
    }

    const relativeContractsPath = path
        .relative(path.dirname(serviceFilePath), path.join(contractsDir, `${actionCamel}.types`))
        .replace(/\\/g, "/");

    serviceSource.addImportDeclaration({
        moduleSpecifier: `./${relativeContractsPath}`,
        namedImports: [
            `type ${actionPascal}Payload`,
            `type ${actionPascal}Response`,
        ],
    });

    serviceObject.addPropertyAssignment({
        name: actionCamel,
        initializer: `async (payload: ${actionPascal}Payload): Promise<${actionPascal}Response> => {
    try {
      const { data } = await ${resourcePascal}API.${actionCamel}(payload);
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  }`,
    });

    await serviceSource.save();
    console.log(`⚙️  ${actionCamel} injetado em ${moduleName}.service.ts`);
}
