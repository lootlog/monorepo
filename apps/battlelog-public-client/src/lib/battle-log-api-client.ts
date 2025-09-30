import { BATTLE_LOG_SERVICE_URL } from "@/src/config/api";
import { Axios } from "axios";

const client = new Axios({
  baseURL: BATTLE_LOG_SERVICE_URL,
});

export const battleLogApiClient = client;
