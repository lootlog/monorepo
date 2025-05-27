import { question } from "zx";

export const replaceEnvWithValues = async (
  sampleEnv: string
): Promise<string> => {
  const lines = sampleEnv.split("\n").filter((line) => line.trim() !== "");
  const keyValuePairs: Record<string, string> = {};

  for (const line of lines) {
    const [key, value] = line.split("=").map((part) => part.trim());

    const input = await question(
      `Enter value for ${key} (default: ${value}): `
    );

    if (key && value) {
      keyValuePairs[key] = input.trim() || value;
    }
  }

  //   let values: Record<string, string> = {};

  //   for (const [key, value] of Object.entries(replacedValues)) {
  //     const input = await question(
  //       `Enter value for ${key} (default: ${value}): `
  //     );
  //     values[key] = input.trim() || value;
  //   }

  const envFile = Object.entries(keyValuePairs).reduce((acc, [key, value]) => {
    const regex = new RegExp(`^${key}=.*`, "gm");
    return acc.replace(regex, `${key}=${value}`);
  }, sampleEnv);

  return envFile;
};
