export function toCamelCase(str: string) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function toPascalCase(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function toUpperSnake(str: string) {
  return str.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
}