import { storageKey } from "@/lib/storage-key";

const STORAGE_KEY = storageKey("ll:battle:submitted");

const MAX_REMEMBERED_SUBMISSIONS = 50;

let unstoredSubmissions: string[] = [];

const readSubmissions = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) ?? "[]",
    );

    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return unstoredSubmissions;
  }
};

const writeSubmissions = (ids: string[]) => {
  unstoredSubmissions = ids;

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {}
};

export const claimBattleSubmission = (submissionId: string): boolean => {
  const ids = readSubmissions();

  if (ids.includes(submissionId)) return false;
  writeSubmissions([...ids, submissionId].slice(-MAX_REMEMBERED_SUBMISSIONS));

  return true;
};

export const releaseBattleSubmission = (submissionId: string): void => {
  writeSubmissions(readSubmissions().filter((id) => id !== submissionId));
};
