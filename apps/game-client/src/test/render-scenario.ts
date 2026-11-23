import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  RENDER_METRICS_DIRECTORY_ENV,
  type RenderReport,
} from "@/scripts/render-metrics";
import { expect, vi } from "vitest";
import { commitsSoFar, startCounting, stopCounting } from "./render-counter";

export const waitForQuietTree = async () => {
  let seen = -1;

  await vi.waitFor(
    () => {
      const now = commitsSoFar();
      const settled = now === seen;
      seen = now;
      expect(settled).toBe(true);
    },
    { interval: 100, timeout: 10_000 },
  );
};

const writeReport = (scenario: string, report: RenderReport) => {
  const directory = process.env[RENDER_METRICS_DIRECTORY_ENV];

  if (!directory) return;
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    path.join(directory, `${scenario}.json`),
    `${JSON.stringify(report, null, 2)}\n`,
  );
};

export const measureRenders = async (
  scenario: string,
  drive: () => Promise<void> | void,
) => {
  await waitForQuietTree();
  startCounting();

  try {
    await drive();
    await waitForQuietTree();
  } catch (error) {
    stopCounting();
    throw error;
  }

  writeReport(scenario, stopCounting());
};
