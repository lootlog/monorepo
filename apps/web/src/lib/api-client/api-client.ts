import axios, { type AxiosInstance } from "axios";
import {
  API_URL,
  BATTLELOG_API_URL,
  SEARCH_API_URL,
  AUTH_API_URL,
  ACTIVITY_API_URL,
} from "@/config/api";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { REQUIRED_SCOPES } from "@/constants/required-scopes";

type ApiName = "default" | "battlelog" | "search" | "auth" | "activity";

const BASE_URLS: Record<ApiName, string | undefined> = {
  default: API_URL,
  battlelog: BATTLELOG_API_URL,
  search: SEARCH_API_URL,
  auth: AUTH_API_URL,
  activity: ACTIVITY_API_URL,
};

const clients = new Map<ApiName, AxiosInstance>();
const intercepted = new WeakSet<AxiosInstance>();

let reauthPromise: Promise<void> | null = null;

const handleReauthentication = async (): Promise<void> => {
  if (reauthPromise) {
    return reauthPromise;
  }

  reauthPromise = (async () => {
    try {
      await authClient.signIn.social({
        provider: "discord",
        callbackURL: window.location.href,
        scopes: REQUIRED_SCOPES,
      });
    } catch (error) {
      console.error("Reauthentication failed:", error);
      throw error;
    } finally {
      reauthPromise = null;
    }
  })();

  return reauthPromise;
};

const attachInterceptors = (instance: AxiosInstance) => {
  if (intercepted.has(instance)) return instance;

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      const requiresReauth = error?.response?.data?.requiresReauth;
      const isPublicEndpoint = error?.config?.url?.includes("/public/");

      if ((status === 401 || requiresReauth) && !isPublicEndpoint) {
        toast.error("Sesja wygasła. Przekierowywanie do logowania...");
        handleReauthentication();
        return Promise.reject(error);
      }

      if (status === 403 && !isPublicEndpoint) {
        toast.error("Brak dostępu");
      }
      if (status === 404) {
        toast.error("Nie znaleziono");
      }
      return Promise.reject(error);
    },
  );

  intercepted.add(instance);
  return instance;
};

export const getApiClient = (api: ApiName = "default"): AxiosInstance => {
  const existing = clients.get(api);
  if (existing) return existing;

  const baseURL = BASE_URLS[api];
  if (!baseURL) {
    console.warn(
      `No base URL configured for API: ${api}, falling back to default`,
    );
  }

  const instance = attachInterceptors(
    axios.create({ baseURL: baseURL ?? API_URL, withCredentials: true }),
  );
  clients.set(api, instance);
  return instance;
};

export const apiClient = getApiClient("default");

export const battlelogApiClient = getApiClient("battlelog");

export const authApiClient = getApiClient("auth");

export const activityApiClient = getApiClient("activity");
