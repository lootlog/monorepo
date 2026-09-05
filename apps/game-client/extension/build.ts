import { build, zip } from "wxt";

const [action, target, browser] = process.argv.slice(2);
if (
  !["build", "zip"].includes(action ?? "") ||
  !["local", "production"].includes(target ?? "") ||
  !["chrome", "firefox"].includes(browser ?? "")
)
  throw new Error(
    "Usage: bun extension/build.ts <build|zip> <local|production> <chrome|firefox>",
  );
const options = {
  browser,
  outDirTemplate: "{{browser}}-mv{{manifestVersion}}",
  manifestVersion: 3 as const,
  mode: target === "local" ? "production-local" : "production",
  outDir: target === "local" ? ".output" : ".output/production",
};
await (action === "zip" ? zip(options) : build(options));
