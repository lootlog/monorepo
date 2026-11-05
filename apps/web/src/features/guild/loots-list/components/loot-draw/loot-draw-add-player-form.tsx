import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { getShortnameByProf } from "@lootlog/domain/profession";
import type { Item } from "@/lib/loots/loot-types";
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

type Profession = Item["prof"][number];

const ERROR_KEYS = {
  inParty: "loots.details.draw.addInParty",
  duplicate: "loots.details.draw.addDuplicate",
  ineligible: "loots.details.draw.addIneligible",
} as const;

export type LootDrawAddError = keyof typeof ERROR_KEYS;

/**
 * Adds a player the map snapshot missed. `validate` says why they cannot
 * enter; a valid player is handed to `onAdd` and the form clears.
 */
export const LootDrawAddPlayerForm = ({
  professions,
  validate,
  onAdd,
}: {
  /** The professions that can wear the item, offered first. */
  professions: readonly Profession[];
  validate: (candidate: {
    name: string;
    prof: Profession;
    lvl: number | null;
  }) => LootDrawAddError | null;
  onAdd: (candidate: {
    name: string;
    prof: Profession;
    lvl: number | null;
  }) => void;
}) => {
  const { t } = useTranslation();
  const id = useId();
  const [name, setName] = useState("");
  const [prof, setProf] = useState<Profession | null>(professions[0] ?? null);
  const [level, setLevel] = useState("");
  const [error, setError] = useState<LootDrawAddError | null>(null);

  // The level is optional: without it only the profession is checked.
  const lvl = Number(level) > 0 ? Number(level) : null;
  const isComplete = name.trim().length > 0 && prof !== null;

  const professionLabel = (profession: Profession) =>
    t(`professions.${getShortnameByProf(profession) ?? profession}`);

  return (
    <form
      className="grid gap-3 px-3 py-3 sm:px-4"
      onSubmit={(event) => {
        event.preventDefault();

        if (!isComplete) return;

        const candidate = { name: name.trim(), prof, lvl };
        const reason = validate(candidate);

        setError(reason);

        if (reason) return;

        onAdd(candidate);
        setName("");
        setLevel("");
      }}
    >
      <p className="text-sm font-medium">{t("loots.details.draw.addTitle")}</p>
      <div className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-end gap-2">
        <div className="col-span-3 grid gap-1.5">
          <Label htmlFor={`${id}-name`}>
            {t("loots.details.draw.addName")}
          </Label>
          <Input
            id={`${id}-name`}
            value={name}
            maxLength={40}
            autoComplete="off"
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-prof`}>
            {t("loots.details.draw.addProfession")}
          </Label>
          <Select
            value={prof}
            onValueChange={(value) => {
              setProf(
                professions.find((profession) => profession === value) ?? null,
              );
              setError(null);
            }}
            items={professions.map((profession) => ({
              value: profession,
              label: professionLabel(profession),
            }))}
          >
            <SelectTrigger id={`${id}-prof`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {professions.map((profession) => (
                <SelectItem key={profession} value={profession}>
                  {professionLabel(profession)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-lvl`}>
            {t("loots.details.draw.addLevel")}
          </Label>
          <Input
            id={`${id}-lvl`}
            inputMode="numeric"
            placeholder={t("loots.details.draw.optional")}
            value={level}
            onChange={(event) => {
              setLevel(event.target.value.replace(/\D/g, "").slice(0, 3));
              setError(null);
            }}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={!isComplete}>
          <Plus className="size-4" />
          {t("loots.details.draw.add")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {t(ERROR_KEYS[error])}
        </p>
      )}
    </form>
  );
};
