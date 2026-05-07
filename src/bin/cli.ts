#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "../commands/init.js";
import { makeClientCommand } from "../commands/make-client.js";
import { makeApiCommand } from "../commands/make-api.js";
import { makeServiceCommand } from "../commands/make-service.js";
import { makeTypeCommand } from "../commands/make-type.js";
import { makeResourceCommand } from "../commands/make-resource.js";
import { syncCommand } from "../commands/sync.js";
import { consumeCommand } from "../commands/consume.js";
const program = new Command();

program.name("forge").description("API contract CLI");

program.command("init")
  .option("--overwrite", "Sobrescrever arquivos existentes")
  .action(initCommand);

program.command("sync")
  .description("Sincroniza o estado do projeto com o registro de intenção")
  .action(syncCommand);

program.command("make:client")
  .argument("<name>")
  .option("--overwrite", "Sobrescrever arquivos existentes")
  .action(makeClientCommand);

program
  .command("make:resource")
  .argument("<name>")
  .option("--sync", "Forçar sincronização após criação")
  .option("--no-sync", "Pular sincronização automática")
  .action(makeResourceCommand);

program
  .command("make:type")
  .argument("<name>")
  .option("--timestamps", "Add timestamps", false)
  .action(makeTypeCommand);

program
  .command("make:service")
  .argument("<name>")
  .action(makeServiceCommand);

program
  .command("make:api")
  .argument("<name>")
  .action(makeApiCommand);

// Registro explícito para suporte a consume:METHOD
["GET", "POST", "PUT", "DELETE", "get", "post", "put", "delete"].forEach((method) => {
  program
    .command(`consume:${method}`)
    .argument("<action>")
    .argument("[resource]")
    .argument("[api]")
    .action(async (action, resource, api) => {
      await consumeCommand(method.toUpperCase(), action, resource, api || "api");
    });
});

program.parse();