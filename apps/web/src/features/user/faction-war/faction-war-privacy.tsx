import { useId } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BandSection } from "@/components/common/band-section";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@lootlog/ui/components/field";
import { Switch } from "@lootlog/ui/components/switch";
import {
  useUpdateFactionWarPick,
  type FactionWar,
} from "./faction-war-queries";

type FactionWarPrivacyProps = {
  war: Pick<FactionWar, "id" | "pick" | "champion">;
};

/** Whether the caller's name shows on the leaderboard and their winner's highlight in game. */
export const FactionWarPrivacy = ({ war }: FactionWarPrivacyProps) => {
  const { t } = useTranslation();
  const hiddenId = useId();
  const highlightId = useId();
  const updatePick = useUpdateFactionWarPick();
  const { pick, champion } = war;

  // A disqualified player is off the leaderboard whatever they choose.
  const ranked = pick && !pick.disqualified ? pick : undefined;

  if (!ranked && !champion?.isChampion) return null;

  const update = (
    warId: string,
    data: {
      hiddenFromLeaderboard?: boolean;
      championHighlightHidden?: boolean;
    },
  ) =>
    updatePick.mutate(
      { pathParams: { warId }, data },
      { onError: () => toast.error(t("factionWar.privacy.saveError")) },
    );

  return (
    <BandSection id="faction-war-privacy" title={t("factionWar.privacy.title")}>
      {ranked && (
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor={hiddenId}>
              {t("factionWar.privacy.hidden")}
            </FieldLabel>
            <FieldDescription>
              {t("factionWar.privacy.hiddenDescription")}
            </FieldDescription>
          </FieldContent>
          <Switch
            id={hiddenId}
            checked={ranked.hiddenFromLeaderboard}
            disabled={updatePick.isPending}
            onCheckedChange={(hiddenFromLeaderboard) =>
              update(war.id, { hiddenFromLeaderboard })
            }
          />
        </Field>
      )}
      {champion?.isChampion && (
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor={highlightId}>
              {t("factionWar.privacy.highlight")}
            </FieldLabel>
            <FieldDescription>
              {t("factionWar.privacy.highlightDescription")}
            </FieldDescription>
          </FieldContent>
          <Switch
            id={highlightId}
            checked={!champion.highlightHidden}
            disabled={updatePick.isPending}
            onCheckedChange={(shown) =>
              update(champion.warId, { championHighlightHidden: !shown })
            }
          />
        </Field>
      )}
    </BandSection>
  );
};
