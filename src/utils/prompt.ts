import readline from "readline";

/**
 * Exibe uma pergunta no terminal e retorna a resposta do usuário como string.
 *
 * @example
 * const answer = await ask("Deseja continuar? (Y/N): ");
 */
export function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Exibe um menu numerado e retorna o valor mapeado à escolha do usuário.
 * Retorna o valor padrão se a entrada for inválida ou vazia.
 *
 * @example
 * const method = await select("Método HTTP:", {
 *   "1": "GET",
 *   "2": "POST",
 *   "3": "PUT",
 *   "4": "DELETE",
 * }, "GET");
 */
export async function select(
  question: string,
  options: Record<string, string>,
  defaultValue: string
): Promise<string> {
  const menu = Object.entries(options)
    .map(([key, label]) => `${key}. ${label}`)
    .join("\n");

  const answer = await ask(`\n${question}\n${menu}\nEscolha: `);
  return options[answer] ?? defaultValue;
}

/**
 * Pergunta uma confirmação Y/N e retorna boolean.
 *
 * @example
 * const confirmed = await confirm("Deseja instalar dependências? (Y/N): ");
 */
export async function confirm(question: string): Promise<boolean> {
  const answer = await ask(question);
  return answer.toLowerCase() === "y";
}
