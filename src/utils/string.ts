/**
 * Normaliza qualquer formato de string (kebab-case, snake_case, PascalCase,
 * camelCase, espaços, ALL_CAPS) em um array de palavras em minúsculas.
 *
 * @example
 * tokenize('user-profile')  → ['user', 'profile']
 * tokenize('USER_PROFILE')  → ['user', 'profile']
 * tokenize('UserProfile')   → ['user', 'profile']
 * tokenize('userProfile')   → ['user', 'profile']
 * tokenize('user profile')  → ['user', 'profile']
 */
function tokenize(str: string): string[] {
  return (
    str
      // Insere espaço antes de letras maiúsculas precedidas de minúsculas (camelCase / PascalCase)
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      // Insere espaço antes de séries de maiúsculas seguidas de minúscula (ex: XMLParser → XML Parser)
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      // Substitui separadores (-, _, espaço) por espaço
      .replace(/[-_\s]+/g, " ")
      .trim()
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
  );
}

/**
 * Converte qualquer formato de string para camelCase.
 *
 * @example
 * toCamelCase('user-profile')  → 'userProfile'
 * toCamelCase('user_profile')  → 'userProfile'
 * toCamelCase('UserProfile')   → 'userProfile'
 * toCamelCase('USER_PROFILE')  → 'userProfile'
 */
export function toCamelCase(str: string): string {
  const words = tokenize(str);
  return words
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join("");
}

/**
 * Converte qualquer formato de string para PascalCase.
 *
 * @example
 * toPascalCase('user-profile')  → 'UserProfile'
 * toPascalCase('user_profile')  → 'UserProfile'
 * toPascalCase('userProfile')   → 'UserProfile'
 * toPascalCase('USER_PROFILE')  → 'UserProfile'
 */
export function toPascalCase(str: string): string {
  const words = tokenize(str);
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/**
 * Converte qualquer formato de string para UPPER_SNAKE_CASE.
 *
 * @example
 * toUpperSnake('userProfile')  → 'USER_PROFILE'
 * toUpperSnake('user-profile') → 'USER_PROFILE'
 */
export function toUpperSnake(str: string): string {
  return tokenize(str).join("_").toUpperCase();
}

/**
 * Converte qualquer formato de string para kebab-case.
 *
 * @example
 * toKebabCase('UserProfile')  → 'user-profile'
 * toKebabCase('userProfile')  → 'user-profile'
 */
export function toKebabCase(str: string): string {
  return tokenize(str).join("-");
}