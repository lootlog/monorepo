import { sleep } from "k6";
import { createOptions } from "./lib/config.js";
import { setupSuite } from "./lib/setup.js";
import { createSummary } from "./lib/summary.js";
import { runApi } from "./scenarios/api.js";
import { runActivity } from "./scenarios/activity.js";
import { runAuth } from "./scenarios/auth.js";
import { runBattlelog } from "./scenarios/battlelog.js";
import { runSearch } from "./scenarios/search.js";

const serviceRunners = {
  activity: runActivity,
  api: runApi,
  auth: runAuth,
  battlelog: runBattlelog,
  search: runSearch,
};

export const options = createOptions();

export function setup() {
  return setupSuite();
}

export default function (data) {
  for (const service of data.config.services) {
    serviceRunners[service](data.config);
  }

  sleep(data.config.sleepSeconds);
}

export function handleSummary(data) {
  return createSummary(data);
}
