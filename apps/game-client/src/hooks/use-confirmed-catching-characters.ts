import { Schema } from "effect";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { storageKey } from "@/lib/storage-key";

const confirmedCharactersSchema = Schema.Record(Schema.String, Schema.Boolean);

// A new key, so every character asks once more after presence started
// following the catching scope.
const STORAGE_KEY = storageKey("ll:catching-scope-confirmed");

type ConfirmedCharacters = Record<string, boolean>;

const NO_CONFIRMED_CHARACTERS: ConfirmedCharacters = {};

/**
 * Characters whose player has decided on this device which Lootlogs they
 * play for, either in the first-entry window or in the catching settings.
 */
export const useConfirmedCatchingCharacters = () => {
  const [confirmed, setConfirmed] = useLocalStorage<ConfirmedCharacters>(
    STORAGE_KEY,
    NO_CONFIRMED_CHARACTERS,
    confirmedCharactersSchema,
  );

  const confirm = (characterId: string) => {
    if (characterId && !confirmed[characterId])
      setConfirmed((current) => ({ ...current, [characterId]: true }));
  };

  return {
    isConfirmed: (characterId: string) => confirmed[characterId] === true,
    confirm,
  };
};
