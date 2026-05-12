import { ensureForgeInitialized, ensureForgeState } from "../utils/config.js";

const STATUS_ICON: Record<string, string> = {
  active: "✅",
  missing: "⚠️ ",
  orphan: "👻",
};

/**
 * Lista todos os módulos registrados no projeto com seu status atual.
 * Lê o forge.state.json como fonte de verdade.
 */
export function listCommand() {
  ensureForgeInitialized();

  const state = ensureForgeState();
  const resources = state.resources;

  if (resources.length === 0) {
    console.log("\n📭 Nenhum módulo registrado.\n");
    console.log("   👉 Crie um com: forge module <name>\n");
    return;
  }

  const active  = resources.filter(r => r.status === "active");
  const missing = resources.filter(r => r.status === "missing");
  const orphans = resources.filter(r => r.status === "orphan");

  console.log(`\n📦 Módulos (${resources.length} total)\n`);

  // Ativos
  if (active.length > 0) {
    active.forEach(r => {
      const methodCount = Object.keys(r.methods ?? {}).length;
      const methods = r.files.contracts?.exists
        ? ` — ${methodCount > 0 ? `${methodCount} método(s)` : "sem métodos ainda"}`
        : "";
      console.log(`  ${STATUS_ICON.active} ${r.name}${methods}`);
    });
  }

  // Incompletos
  if (missing.length > 0) {
    missing.forEach(r => {
      const missingFiles = Object.entries(r.files)
        .filter(([, v]) => !v.exists)
        .map(([k]) => k)
        .join(", ");
      console.log(`  ${STATUS_ICON.missing} ${r.name}  ← incompleto (faltando: ${missingFiles})`);
    });
  }

  // Órfãos
  if (orphans.length > 0) {
    orphans.forEach(r => {
      console.log(`  ${STATUS_ICON.orphan} ${r.name}  ← órfão (existe no disco, não registrado)`);
    });
  }

  console.log("");

  // Dicas contextuais
  if (missing.length > 0) {
    console.log(`  💡 Módulos incompletos: re-execute 'forge module <name>' para corrigir.\n`);
  }
  if (orphans.length > 0) {
    console.log(`  💡 Módulos órfãos: rode 'forge sync' para registrá-los no estado.\n`);
  }
}
