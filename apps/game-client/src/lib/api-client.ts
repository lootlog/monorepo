import { API_URL, BATTLELOG_API_URL, AUTH_API_URL } from "@/config/api";
import axios, { type AxiosInstance } from "axios";

const API_URL_MAP = {
  default: API_URL,
  battlelog: BATTLELOG_API_URL,
  auth: AUTH_API_URL,
} as const;

type ApiType = keyof typeof API_URL_MAP;

const clients = new Map<ApiType, AxiosInstance>();

export function getApiClient(api: ApiType = "default"): AxiosInstance {
  const existing = clients.get(api);
  if (existing) return existing;

  const client = axios.create({
    baseURL: API_URL_MAP[api],
    withCredentials: true,
  });

  clients.set(api, client);
  return client;
}
