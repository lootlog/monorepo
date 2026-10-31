import { Ban } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@lootlog/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@lootlog/ui/components/field";
import { Textarea } from "@lootlog/ui/components/textarea";
import { IconDialogHeader } from "@/components/common/icon-dialog-header";
import type { FactionWarModeratedPlayer } from "./faction-war-leaderboard-actions";
import { getFactionWarModerationErrorKey } from "./faction-war-moderation-error";
import { useDisqualifyFactionWarPlayer } from "./faction-war-queries";

/** The API's limit on a disqualification reason. */
const REASON_MAX_LENGTH = 500;

type FactionWarDisqualifyDialogProps = {
  warId: string;
  player: FactionWarModeratedPlayer;
  onClose: () => void;
};

/** Excludes a player from the war, once an admin has said why. */
export const FactionWarDisqualifyDialog = ({
  warId,
  player,
  onClose,
}: FactionWarDisqualifyDialogProps) => {
  const { t } = useTranslation();
  const reasonId = useId();
  const hintId = useId();
  const [reason, setReason] = useState("");
  const disqualify = useDisqualifyFactionWarPlayer();
  const trimmedReason = reason.trim();
  const name = player.characterName ?? t("factionWar.ranking.hiddenPlayer");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (trimmedReason === "" || disqualify.isPending) return;

    disqualify.mutate(
      {
        pathParams: { warId, userId: player.userId },
        data: { reason: trimmedReason },
      },
      {
        onSuccess: () => {
          onClose();
          toast.success(t("factionWar.moderation.disqualified", { name }), {
            description: t("factionWar.moderation.refreshDelay"),
          });
        },
        // The reason stays in the field, so the admin can try again.
        onError: (error) =>
          toast.error(t(getFactionWarModerationErrorKey(error))),
      },
    );
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !disqualify.isPending) onClose();
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <IconDialogHeader
          icon={Ban}
          tone="destructive"
          title={t("factionWar.moderation.disqualifyDialog.title", { name })}
          description={t("factionWar.moderation.disqualifyDialog.description")}
        />
        <form className="flex flex-col gap-4 p-5" onSubmit={handleSubmit}>
          <Field>
            <FieldLabel htmlFor={reasonId}>
              {t("factionWar.moderation.disqualifyDialog.reason")}
            </FieldLabel>
            <Textarea
              id={reasonId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t(
                "factionWar.moderation.disqualifyDialog.reasonPlaceholder",
              )}
              aria-describedby={hintId}
              maxLength={REASON_MAX_LENGTH}
              rows={4}
              required
              autoFocus
              disabled={disqualify.isPending}
            />
            <FieldDescription
              id={hintId}
              className="flex justify-between gap-3"
            >
              <span>
                {t("factionWar.moderation.disqualifyDialog.reasonHint")}
              </span>
              <span className="shrink-0 tabular-nums">
                {reason.length}/{REASON_MAX_LENGTH}
              </span>
            </FieldDescription>
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={disqualify.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              loading={disqualify.isPending}
              disabled={trimmedReason === ""}
            >
              {t("factionWar.moderation.disqualify")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
