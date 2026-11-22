import { $ } from "bun";

import rootPackage from "../package.json" with { type: "json" };

const repositories = [
  {
    name: "effect",
    url: "https://github.com/Effect-TS/effect.git",
    ref: `effect@${rootPackage.workspaces.catalog.effect}`,
  },
];

const repositoriesDirectory = new URL("../repos/", import.meta.url).pathname;

for (const { name, url, ref } of repositories) {
  const target = `${repositoriesDirectory}${name}`;
  const marker = Bun.file(`${target}/.reference-ref`);

  if ((await marker.exists()) && (await marker.text()).trim() === ref) {
    process.stdout.write(`${name}: ${ref} is already present\n`);
    continue;
  }

  await $`rm -rf ${target}`;
  await $`git clone --quiet --depth 1 --branch ${ref} ${url} ${target}`;
  await $`rm -rf ${target}/.git`;
  await Bun.write(marker, `${ref}\n`);
  process.stdout.write(`${name}: fetched ${ref}\n`);
}
