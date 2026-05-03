import fs from "fs-extra";
import path from "path";

export function loadTemplate(templateName: string) {
  // caminho do executável real
  const cliPath = process.argv[1];

  // resolve diretório do dist
  const distDir = path.dirname(cliPath);

  const templatePath = path.join(distDir, "templates", templateName);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template não encontrado: ${templatePath}`);
  }

  return fs.readFileSync(templatePath, "utf-8");
}