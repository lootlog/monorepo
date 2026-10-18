import { storageKey } from "@/lib/storage-key";

const STORAGE_KEY = storageKey("ll:battle:submitted");

// Far more than the battles a tab can see while Margonem still repeats one.
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
  } catch {
    // Without storage the tab still remembers its submissions until a reload.
  }
};

/**
 * Margonem repeats a finished battle until the player closes it, also after
 * a page reload. The tab remembers each battle it submitted, so a repeat never
 * sends it again. Returns false when the battle was already claimed.
 */
export const claimBattleSubmission = (submissionId: string): boolean => {
  const ids = readSubmissions();

  if (ids.includes(submissionId)) return false;
  writeSubmissions([...ids, submissionId].slice(-MAX_REMEMBERED_SUBMISSIONS));

  return true;
};

/** Lets a later repeat of the battle send it again after a transient failure. */
export const releaseBattleSubmission = (submissionId: string): void => {
  writeSubmissions(readSubmissions().filter((id) => id !== submissionId));
};
