#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "../commands/init.js";
import { moduleCommand } from "../commands/module.js";
import { addCommand } from "../commands/add.js";
import { syncCommand } from "../commands/sync.js";
import { listCommand } from "../commands/list.js";

const program = new Command();

program.name("forge").description("API contract CLI");

program.command("init")
  .option("--overwrite", "Sobrescrever arquivos existentes")
  .action(initCommand);

program.command("sync")
  .alias("s")
  .description("Sincroniza o estado do projeto com o registro de intenção")
  .action(syncCommand);

program
  .command("module")
  .alias("m")
  .argument("<name>")
  .option("--minimal", "Pular a criação de types inicialmente")
  .option("--sync", "Forçar sincronização após criação")
  .option("--no-sync", "Pular sincronização automática")
  .action(moduleCommand);

program
  .command("add")
  .alias("a")
  .argument("<module>")
  .argument("<functionName>")
  .option("--get", "Usar método GET")
  .option("--post", "Usar método POST")
  .option("--put", "Usar método PUT")
  .option("--delete", "Usar método DELETE")
  .action(addCommand);

program.command("remove").alias("rm").action(() => console.log("🚧 Em desenvolvimento"));
program.command("rename").alias("rn").action(() => console.log("🚧 Em desenvolvimento"));
program
  .command("list")
  .alias("l")
  .description("Lista todos os módulos do projeto")
  .action(listCommand);
program.command("describe").alias("d").action(() => console.log("🚧 Em desenvolvimento"));

program.parse();