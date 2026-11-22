const generatedSourcePattern =
  /(?:^|\/)packages\/(?:client|sdk)\/src\/generated\//;

const ignoredFilePattern = /(?:^|\/)bun\.lock$/;

const quote = (file) => JSON.stringify(file);

const filterIgnoredFiles = (files) => {
  return files.filter(
    (file) =>
      !generatedSourcePattern.test(file) && !ignoredFilePattern.test(file),
  );
};

const buildCommand = (command, files) => {
  const targets = filterIgnoredFiles(files);

  if (targets.length === 0) {
    return [];
  }

  return `${command} ${targets.map(quote).join(" ")}`;
};

export default {
  "**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}": (files) =>
    [
      buildCommand("oxfmt --no-error-on-unmatched-pattern", files),
      buildCommand("oxlint --no-error-on-unmatched-pattern", files),
    ].flat(),
  "**/*.{json,md,css,html,yml,yaml}": (files) =>
    buildCommand("oxfmt --no-error-on-unmatched-pattern", files),
};
