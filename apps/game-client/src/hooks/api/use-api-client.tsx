import { API_URL, BATTLELOG_API_URL } from "@/config/api";
import axios from "axios";

const API_URL_MAP = {
  default: API_URL,
  battlelog: BATTLELOG_API_URL,
};

export const useAuthenticatedApiClient = (
  api: keyof typeof API_URL_MAP = "default"
) => {
  const client = axios.create({
    baseURL: API_URL_MAP[api],
    withCredentials: true,
  });

  return { client };
};

export const useApiClient = () => {
  const client = axios.create({
    baseURL: API_URL,
  });

  return { client };
};
