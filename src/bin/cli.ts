#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "../commands/init.js";
import { consumeCommand } from "../commands/consume.js";
import { makeCommand } from "../commands/make.js";
import { makeClientCommand } from "../commands/make-client.js";
import { makeApiCommand } from "../commands/make-api.js";
import { makeServiceCommand } from "../commands/make-service.js";
const program = new Command();

program.name("forge").description("API contract CLI");

program.command("init")
  .option("--overwrite", "Sobrescrever arquivos existentes")
  .action(initCommand);

program.command("make:client")
  .argument("<name>")
  .option("--overwrite", "Sobrescrever arquivos existentes")
  .action(makeClientCommand);

program
  .command("make:api")
  .argument("<name>")
  .action(makeApiCommand);

  program
  .command("make:service")
  .argument("<name>")
  .action(makeServiceCommand);

program
  .command("make <model> <type>")
  .action(makeCommand);

program
  .command("consume <model> <action>")
  .action(consumeCommand);

program.parse();