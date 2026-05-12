# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@vitongovisk/forge` is a CLI (`forge`) published to npm that scaffolds an opinionated, modular frontend architecture in a consumer's TypeScript project: Axios HTTP client, contract types, services, and TanStack Query hooks. The repo *is* the CLI; it does not contain a sample app. To exercise the CLI you must run the built `dist/cli.js` inside another project directory that has `axios` and `@tanstack/react-query` installed.

## Common commands

```bash
npm run build         # tsup bundles src/bin/cli.ts → dist/cli.js (ESM) and copies templates via cpy
npm run dev           # runs the already-built dist/cli.js with node — must build first
node dist/cli.js init # invoke a forge subcommand directly (typical local-dev loop)
```

There is no test suite (`npm test` is a placeholder) and no linter configured. The `tsup.config.ts` file is **stale** — the actual build flags in `package.json` (`--format esm`, entry `src/bin/cli.ts`) override it, so edits to `tsup.config.ts` have no effect.

To dogfood against a real project: `npm run build`, then `cd` into a target project and run `node /abs/path/to/forge/dist/cli.js <command>`.

## High-level architecture

Forge follows a **commands-orchestrate / generators-do-work** split (see [contex.md](contex.md) — the V2 RFC). Understanding both halves is required before adding features.

### Three-file state model

Every initialized project has three sibling JSON files at its root, each with a distinct role. Confusing them is the most common source of bugs:

| File | Role | Source of truth for |
|---|---|---|
| [.forge.json](src/utils/config.ts) | **Config** | User preferences — `modulePath`, `sync.mode` |
| `forge.data.json` | **Intent** | What the user *declared* exists (modules + method names) |
| `forge.state.json` | **Reality** | What `sync` *observed* on disk (file existence, status: `active`/`missing`/`orphan`) |

`syncCommand` reconciles intent → reality: it walks `data.resources`, probes the filesystem via [resolveModuleFiles](src/commands/sync.ts#L16), and additionally scans `modulePath/` for directories not in `data.json` (orphans). The `api/` directory is always excluded as it's global infrastructure, not a module.

When `sync.mode === "auto"`, mutating commands (`module`, `add`) call `syncCommand()` at the end. Be careful with this: don't introduce new mutating commands without considering whether they should re-sync.

### Command → Generator delegation

[src/commands/](src/commands/) entries are **thin orchestrators**:
1. Resolve user intent (parse flags, prompt interactively if needed)
2. Load/validate config + data + state
3. Compute paths
4. Call generators
5. Update `forge.data.json` and trigger sync

All file emission and AST mutation lives in [src/generator/](src/generator/). When adding a new endpoint type or output file, edit the relevant generator — not the command.

### Two-phase code generation

`forge module <name>` and `forge add <module> <fn>` are **not symmetric**:

- **`module` scaffolds**: writes fresh files from `.tpl` templates with placeholder substitution (`{{PascalName}}`, `{{camelName}}`, etc.). Skips if the file exists. Lives in [generateApiScaffold](src/generator/api.generator.ts#L26), [generateServiceScaffold](src/generator/service.generator.ts#L25), [generateTypeScaffold](src/generator/types.generator.ts#L24).
- **`add` injects**: uses **ts-morph** to mutate existing `*.api.ts` and `*.service.ts` files — it locates the `<Module>API` / `<Module>Service` variable declaration's object literal and calls `addPropertyAssignment` plus `addImportDeclaration`. See [injectApiMethod](src/generator/api.generator.ts#L54) and [injectServiceMethod](src/generator/service.generator.ts#L60).

This means: **the scaffold templates must produce a const-bound object literal that ts-morph can find later by name**. If you rename `{{PascalName}}API` in [api.tpl](src/templates/api.tpl) or break the `export const X = { }` shape, AST injection silently fails with a `console.warn` — there is no hard error. Generated hooks and contract files, by contrast, are always full-file writes from templates (no AST).

### Templates

Templates live in [src/templates/*.tpl](src/templates/) as plain text with `{{Placeholder}}` markers (single-pass `String.replace(/{{X}}/g, ...)` — there is no real template engine). They're copied to `dist/templates/` by `cpy` during build.

[loadTemplate](src/utils/template.ts) resolves them via `path.dirname(process.argv[1])` — i.e. relative to the *running* `dist/cli.js`. This is why the CLI breaks if invoked through a wrapper that rewrites `argv[1]`, and why running from `src/` directly with ts-node would not find templates.

### Method-name → file/code mapping

The string-casing helpers in [src/utils/string.ts](src/utils/string.ts) (`toPascalCase`, `toCamelCase`, `tokenize`) are load-bearing. The same `functionName` becomes:
- `<actionCamel>.types.ts` (contract file)
- `<actionCamel>` (api/service property name)
- `use<ActionPascal>.hook.ts` (hook file)
- `use<ActionPascal>` (hook export)

If you change casing rules, all four places shift. The `tokenize` function handles kebab/snake/Pascal/camel/SCREAMING — any input should normalize to a stable word list.

### HTTP method semantics baked into generators

[injectApiMethod](src/generator/api.generator.ts#L79) and [generateContract](src/generator/types.generator.ts#L69) encode method-specific behavior inline:

- **GET / PUT / DELETE** → URL is `` `/${moduleName}/${payload.params.id}` ``
- **POST** → URL is `"/${moduleName}/<actionCamel>"`, body is `payload.body`
- **PUT** → body included, params for id
- Per-method default error maps (`403`, `404`, `422`) live in the `errorMaps` record

Changing URL conventions or adding a new HTTP verb requires edits in both files plus the CLI option definitions in [src/bin/cli.ts](src/bin/cli.ts).

## Stub commands

`forge remove`, `forge rename`, `forge describe` are registered in [cli.ts](src/bin/cli.ts) but log "🚧 Em desenvolvimento". Don't assume they work — implementing them is on the roadmap (see [README.md](README.md) and [contex.md](contex.md)).

## Conventions

- All user-facing CLI output is in **Portuguese** (pt-BR). Match this when editing existing messages.
- Modules import `@/api/...` and `@/utils/...` — generated code assumes the consumer project has a `@/*` path alias to `src/*`.
- Barrel `index.ts` files are in the V2 roadmap but **not yet generated**. Don't add `export *` references to non-existent barrels.
