import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Generated API clients and vendored reference repositories are ignored by
// .oxlintrc.json and .oxfmtrc.jsonc, but oxlint still lints ignored files
// passed to it by path.
const generatedSourcePattern =
  /(?:^|\/)packages\/(?:client|sdk)\/src\/generated\//;

const vendoredRepositoryDirectory = fileURLToPath(
  new URL("./repos/", import.meta.url),
);

const ignoredFilePattern = /(?:^|\/)bun\.lock$/;

const quote = (file) => JSON.stringify(file);

const filterIgnoredFiles = (files) => {
  return files.filter(
    (file) =>
      !generatedSourcePattern.test(file) &&
      !resolve(file).startsWith(vendoredRepositoryDirectory) &&
      !ignoredFilePattern.test(file),
  );
};

const buildCommand = (command, files) => {
  const targets = filterIgnoredFiles(files);

  if (targets.length === 0) {
    return [];
  }

  return `${command} ${targets.map(quote).join(" ")}`;
};

// lint-staged runs different globs concurrently, so a file must match only one
// glob; within it, the commands run in order and lint sees the formatted file.
export default {
  "**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}": (files) =>
    [
      buildCommand("oxfmt --no-error-on-unmatched-pattern", files),
      buildCommand("oxlint --no-error-on-unmatched-pattern", files),
    ].flat(),
  "**/*.{json,md,css,html,yml,yaml}": (files) =>
    buildCommand("oxfmt --no-error-on-unmatched-pattern", files),
};
