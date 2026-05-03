export type ForgeConfig = {
  structure: "layer" | "module";
  paths: {
    api: string;
    service: string;
    types: string;
    hooks: string;
  };
  modulePath: string;
  apiFile: string;
};