import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";

const services = ["activity", "auth", "battlelog", "main", "search"] as const;
const generatedRoot = resolve("src/generated");

const listTypeScriptFiles = (directory: string): string[] => {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return listTypeScriptFiles(path);
    }

    return extname(entry.name) === ".ts" ? [path] : [];
  });
};

const normalizeModelFileName = (fileName: string): string => {
  return fileName.replaceAll("-", "").toLowerCase();
};

const createModelFileMap = (service: (typeof services)[number]) => {
  const modelDirectory = join(generatedRoot, "models", service);
  const modelFiles = listTypeScriptFiles(modelDirectory);
  const modelFileMap = new Map<string, string>();

  for (const modelFile of modelFiles) {
    const modelFileName = basename(modelFile, extname(modelFile));
    const normalizedName = normalizeModelFileName(modelFileName);
    const existingFileName = modelFileMap.get(normalizedName);

    if (existingFileName && existingFileName !== modelFileName) {
      throw new Error(
        `Model file collision for ${service}: ${existingFileName} and ${modelFileName}`,
      );
    }

    modelFileMap.set(normalizedName, modelFileName);
  }

  return modelFileMap;
};

const fixModelImportPaths = (
  source: string,
  modelFilesByService: ReadonlyMap<
    (typeof services)[number],
    ReadonlyMap<string, string>
  >,
  filePath: string,
): string => {
  return source.replaceAll(
    /(["'][^"']*\/models\/(activity|auth|battlelog|main|search)\/)([a-z0-9-]+)(["'])/g,
    (
      importPath,
      prefix: string,
      service: (typeof services)[number],
      fileName: string,
      suffix: string,
    ) => {
      const modelFileName = modelFilesByService
        .get(service)
        ?.get(normalizeModelFileName(fileName));

      if (!modelFileName) {
        throw new Error(
          `Unable to resolve generated model import ${importPath} in ${relative(process.cwd(), filePath)}`,
        );
      }

      return `${prefix}${modelFileName}${suffix}`;
    },
  );
};

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
  const modelFilesByService = new Map(
    services.map((service) => [service, createModelFileMap(service)]),
  );

  for (const layer of ["core", "react-query"]) {
    const layerDirectory = join(generatedRoot, layer);

    for (const filePath of listTypeScriptFiles(layerDirectory)) {
      const source = readFileSync(filePath, "utf8");
      const fixedSource = `${fixRequestOptionsType(
        fixModelImportPaths(source, modelFilesByService, filePath),
        filePath,
      ).trimEnd()}\n`;

      if (fixedSource !== source) {
        writeFileSync(filePath, fixedSource);
      }
    }
  }
};
