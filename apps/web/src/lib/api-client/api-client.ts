import axios, { type AxiosInstance } from "axios";
import { API_URL, BATTLELOG_API_URL, SEARCH_API_URL } from "@/config/api";
import { toast } from "sonner";

type ApiName = "default" | "battlelog" | "search";

const BASE_URLS: Record<ApiName, string | undefined> = {
  default: API_URL,
  battlelog: BATTLELOG_API_URL,
  search: SEARCH_API_URL,
};

const clients = new Map<ApiName, AxiosInstance>();
const intercepted = new WeakSet<AxiosInstance>();

const attachInterceptors = (instance: AxiosInstance) => {
  if (intercepted.has(instance)) return instance;

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      if (status === 403) {
        toast.error("Brak dostępu");
      }
      if (status === 404) {
        toast.error("Nie znaleziono");
      }
      return Promise.reject(error);
    }
  );

  intercepted.add(instance);
  return instance;
};

export const getApiClient = (api: ApiName = "default"): AxiosInstance => {
  const existing = clients.get(api);
  if (existing) return existing;

  const baseURL = BASE_URLS[api] ?? API_URL;
  const instance = attachInterceptors(
    axios.create({ baseURL, withCredentials: true })
  );
  clients.set(api, instance);
  return instance;
};

export const apiClient = getApiClient("default");

export const battlelogApiClient = getApiClient("battlelog");

let interceptorsInitialized = false;
export const setupApiInterceptors = () => {
  if (interceptorsInitialized) return;
  clients.forEach((client) => attachInterceptors(client));
  interceptorsInitialized = true;
};
