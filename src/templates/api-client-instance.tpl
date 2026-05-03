export const {{camelName}}Api = axios.create({
  baseURL: import.meta.env.VITE_API_{{upperName}}_URL,
  timeout: 1000 * 15,
});

setupInterceptors({{camelName}}Api, false);