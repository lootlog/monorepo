const generatedSourcePattern =
  /(?:^|\/)apps\/(?:(?:web|game-client)\/src\/lib\/api\/generated|(?:api|activity)\/src\/generated\/prisma)\//;
const ignoredFilePattern = /(?:^|\/)pnpm-lock\.yaml$/;

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
    buildCommand("oxlint --no-error-on-unmatched-pattern", files),
  "**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx,json,md,css,html,yml,yaml}": (files) =>
    buildCommand("oxfmt", files),
};
