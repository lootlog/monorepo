import { readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { clientServices } from "./client-services";

const generatedRoot = resolve("src/generated");

const fixRequestOptionsType = (source: string, filePath: string): string => {
  if (!source.includes("options?: RequestInit")) {
    return source;
  }

  const mutatorName = source.match(
    /import\s*{\s*([a-z]+Fetch)\s*}\s*from\s*["'][^"']*\/mutators["']/,
  )?.[1];

  if (!mutatorName) {
    throw new Error(
      `Unable to find the generated mutator import in ${relative(process.cwd(), filePath)}`,
    );
  }

  return source.replaceAll(
    "options?: RequestInit",
    `options?: Parameters<typeof ${mutatorName}>[1]`,
  );
};

export const fixGeneratedOutput = (): void => {
  for (const service of Object.keys(clientServices)) {
    const filePath = join(generatedRoot, `${service}.ts`);
    const source = readFileSync(filePath, "utf8");
    const fixedSource = `${fixRequestOptionsType(source, filePath).trimEnd()}\n`;

    if (fixedSource !== source) {
      writeFileSync(filePath, fixedSource);
    }
  }
};
