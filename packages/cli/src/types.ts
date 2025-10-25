export interface EnvFile {
  path: string;
  samplePath: string;
  name: string;
}

export interface EnvVariable {
  key: string;
  value: string;
  isComment: boolean;
  isEmpty: boolean;
  originalLine: string;
}

export interface CliOptions {
  auto: boolean;
  interactive: boolean;
  skipExisting: boolean;
  force: boolean;
}
