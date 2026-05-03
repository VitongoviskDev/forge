import axios from "axios";
import type { AxiosInstance } from "axios";

type LogoutCallback = () => void;

let logoutHandlers: LogoutCallback[] = [];

export function setLogoutHandler(callback: LogoutCallback) {
  logoutHandlers.push(callback);
}

const setupInterceptors = (
  instance: AxiosInstance,
  shouldLogoutOnUnauthorizedException = false
) => {
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");

    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status;

      if (status === 401 && shouldLogoutOnUnauthorizedException) {
        if (logoutHandlers.length === 0) {
          console.error("Logout handler not specified");
          return Promise.reject(error);
        }

        logoutHandlers.forEach((handler) => handler());
      }

      return Promise.reject(error);
    }
  );
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 1000 * 15,
});

setupInterceptors(api);