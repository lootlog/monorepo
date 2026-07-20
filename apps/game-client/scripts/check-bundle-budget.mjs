import { readFileSync } from "node:fs";
import path from "node:path";
import {
  brotliCompressSync,
  constants as zlibConstants,
  gzipSync,
} from "node:zlib";

const GZIP_BUDGET_BYTES = 460_000;
const BROTLI_BUDGET_BYTES = 363_000;
const DEFAULT_BUNDLE_PATH = "dist/@lootlog/game-client.user.js";

const resolveBundlePath = (arguments_) => {
  if (arguments_.length === 0) {
    return path.resolve(process.cwd(), DEFAULT_BUNDLE_PATH);
  }

  if (arguments_.length === 2 && arguments_[0] === "--bundle") {
    return path.resolve(process.cwd(), arguments_[1]);
  }

  throw new Error("Usage: check-bundle-budget.mjs [--bundle <path>]");
};

const formatBytes = (bytes) => `${bytes.toLocaleString("en-US")} B`;

const writeMeasurement = ({ actualBytes, budgetBytes, encoding }) => {
  const passed = actualBytes <= budgetBytes;
  process.stdout.write(
    `[bundle-budget] ${encoding}: ${formatBytes(actualBytes)} / ${formatBytes(budgetBytes)} ${passed ? "PASS" : "FAIL"}\n`,
  );
  return passed;
};

const checkBundleBudget = (bundlePath) => {
  const bundle = readFileSync(bundlePath);
  const gzipBytes = gzipSync(bundle, { level: 9 }).byteLength;
  const brotliBytes = brotliCompressSync(bundle, {
    params: {
      [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
    },
  }).byteLength;

  process.stdout.write(
    `[bundle-budget] bundle: ${bundlePath} (${formatBytes(bundle.byteLength)} raw)\n`,
  );
  const gzipPassed = writeMeasurement({
    actualBytes: gzipBytes,
    budgetBytes: GZIP_BUDGET_BYTES,
    encoding: "gzip",
  });
  const brotliPassed = writeMeasurement({
    actualBytes: brotliBytes,
    budgetBytes: BROTLI_BUDGET_BYTES,
    encoding: "brotli",
  });

  if (!gzipPassed || !brotliPassed) {
    throw new Error("Release bundle budget exceeded");
  }
};

try {
  checkBundleBudget(resolveBundlePath(process.argv.slice(2)));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[bundle-budget] ${message}\n`);
  process.exitCode = 1;
}
