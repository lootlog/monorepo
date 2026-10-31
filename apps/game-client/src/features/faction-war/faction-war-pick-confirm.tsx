import type { FactionWarFaction } from "@lootlog/domain/faction-war";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getFactionStyle } from "./faction-war-presentation";

type FactionWarPickConfirmProps = {
  faction: FactionWarFaction;
  emblemSrc: string | undefined;
  characterName: string;
  world: string;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onBack: () => void;
};

/** Asks once more before a faction is locked for the whole war. */
export const FactionWarPickConfirm: FC<FactionWarPickConfirmProps> = ({
  faction,
  emblemSrc,
  characterName,
  world,
  pending,
  error,
  onConfirm,
  onBack,
}) => {
  const { t } = useTranslation("factionWar");
  const name = t(`factions.${faction}.name`);

  return (
    <div className="ll-fw-dialog" style={getFactionStyle(faction)}>
      <div
        className="ll-fw-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ll-fw-confirm-title"
        aria-describedby="ll-fw-confirm-text ll-fw-confirm-ranking"
      >
        <img className="ll-fw-emblem" src={emblemSrc} alt="" />
        <h3 id="ll-fw-confirm-title" className="ll-fw-card-title">
          {t("confirm.title", { name })}
        </h3>
        <p id="ll-fw-confirm-text" className="ll-fw-card-text">
          {t("confirm.description", { character: characterName, world })}
        </p>
        <p id="ll-fw-confirm-ranking" className="ll-fw-card-note">
          {t("confirm.ranking")}
        </p>
        {error ? (
          <p role="alert" className="ll:m-0 ll:text-[13px] ll:text-red-300">
            {error}
          </p>
        ) : null}
        <div className="ll:mt-1 ll:flex ll:gap-2">
          <Button
            variant="outline"
            autoFocus
            disabled={pending}
            onClick={onBack}
          >
            {t("confirm.back")}
          </Button>
          <Button loading={pending} onClick={onConfirm}>
            {t("confirm.accept")}
          </Button>
        </div>
      </div>
    </div>
  );
};
