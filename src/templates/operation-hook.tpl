import { {{HookType}} } from "@tanstack/react-query";
import { {{ResourcePascal}}Service } from "./{{resource}}.service";
import { {{ActionPascal}}Payload, {{ActionPascal}}Response } from "./{{ActionPath}}.types";

export const use{{ActionPascal}} = () => {
  return {{HookType}}<{{ActionPascal}}Response, Error, {{ActionPascal}}Payload>({
    {{HookProperty}}: (payload) => {{ResourcePascal}}Service.{{ActionCamel}}(payload),
  });
};
