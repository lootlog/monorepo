import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { glob } from "zx";
import path from "node:path";
import type { EnvFile, EnvVariable } from "../types.js";

export const discoverEnvFiles = async (
  rootPath: string,
): Promise<EnvFile[]> => {
  const envFiles: EnvFile[] = [];

  const rootSamplePath = path.join(rootPath, ".env.sample");
  if (existsSync(rootSamplePath)) {
    envFiles.push({
      path: path.join(rootPath, ".env"),
      samplePath: rootSamplePath,
      name: "root",
    });
  }

  const appsSampleFiles = await glob(`${rootPath}/apps/**/.env.sample`);

  for (const samplePath of appsSampleFiles) {
    const appDir = path.dirname(samplePath);
    const appName = path.basename(appDir);
    envFiles.push({
      path: path.join(appDir, ".env"),
      samplePath,
      name: `apps/${appName}`,
    });
  }

  return envFiles.sort((a, b) => {
    if (a.name === "root") return -1;
    if (b.name === "root") return 1;
    return a.name.localeCompare(b.name);
  });
};

export const parseEnvFile = (content: string): EnvVariable[] => {
  const lines = content.split("\n");
  const variables: EnvVariable[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === "") {
      variables.push({
        key: "",
        value: "",
        isComment: false,
        isEmpty: true,
        originalLine: line,
      });
      continue;
    }

    if (trimmedLine.startsWith("#")) {
      variables.push({
        key: "",
        value: "",
        isComment: true,
        isEmpty: false,
        originalLine: line,
      });
      continue;
    }

    const equalIndex = line.indexOf("=");
    if (equalIndex === -1) {
      variables.push({
        key: "",
        value: "",
        isComment: false,
        isEmpty: false,
        originalLine: line,
      });
      continue;
    }

    const key = line.substring(0, equalIndex).trim();
    const value = line.substring(equalIndex + 1).trim();

    variables.push({
      key,
      value,
      isComment: false,
      isEmpty: false,
      originalLine: line,
    });
  }

  return variables;
};

export const buildEnvContent = (variables: EnvVariable[]): string => {
  return variables
    .map((variable) => {
      if (variable.isEmpty) {
        return "";
      }

      if (variable.isComment) {
        return variable.originalLine;
      }

      if (!variable.key) {
        return variable.originalLine;
      }

      return `${variable.key}=${variable.value}`;
    })
    .join("\n");
};

export const writeEnvFile = (filePath: string, content: string): void => {
  try {
    writeFileSync(filePath, content, "utf-8");
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error}`);
  }
};

export const readEnvFile = (filePath: string): string => {
  try {
    return readFileSync(filePath, "utf-8");
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error}`);
  }
};

export const envFileExists = (filePath: string): boolean => {
  return existsSync(filePath);
};
