import fs from "fs-extra";
import path from "path";

export function fileExists(path: string) {
  return fs.existsSync(path);
}

export function readJson(path: string) {
  return fs.readJSONSync(path);
}

export async function writeFileSafe(filePath: string, content: string) {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content);
}

export function getAvailableModels() {
  const cwd = process.cwd();

  const typesDir = path.join(cwd, "src/types");

  const files = fs.existsSync(typesDir)
    ? fs.readdirSync(typesDir)
    : [];

  return files
    .filter(f => f.endsWith(".type.ts"))
    .map(f => f.replace(".type.ts", ""));
}