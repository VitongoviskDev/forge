import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

// process.argv[1] points to the bin symlink when installed globally; use import.meta.url instead.
const distDir = path.dirname(fileURLToPath(import.meta.url));

export function loadTemplate(templateName: string) {
  const templatePath = path.join(distDir, "templates", templateName);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template não encontrado: ${templatePath}`);
  }
  return fs.readFileSync(templatePath, "utf-8");
}