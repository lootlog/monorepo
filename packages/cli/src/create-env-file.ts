import { writeFileSync, readFileSync } from "fs";
import { question } from "zx";

export const createEnvFile = async (
  envFilePath: string,
  envContent: string
): Promise<void> => {
  let envFile;

  try {
    envFile = readFileSync(envFilePath, "utf-8");
  } catch (error) {
    console.error(
      `Error reading env content: ${error}. Creating new env file.`
    );
  }

  if (envFile) {
    const overwrite = await question(
      "Env file already exists. Do you want to overwrite it? (y/n) "
    );
    if (overwrite.toLowerCase() !== "y") {
      console.log("Env file creation aborted.");
      return;
    }
  }

  try {
    writeFileSync(envFilePath, envContent, "utf-8");
    console.log(`Env file created: ${envFilePath}`);
  } catch (error) {
    console.error(`Error during env file creation: ${error}`);
  }
};
