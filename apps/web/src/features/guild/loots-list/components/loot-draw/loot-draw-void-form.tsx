import { Button } from "@lootlog/ui/components/button";
import { Textarea } from "@lootlog/ui/components/textarea";
import { Label } from "@lootlog/ui/components/label";
import type { LootDrawResponseDto } from "@lootlog/client/main";
import { Ban } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@lootlog/ui/components/sonner";
import type { useLootDraws } from "./use-loot-draws";

const MAX_REASON_LENGTH = 200;

/** Voids a standing result with a reason, so the item can be drawn again. */
export const LootDrawVoidForm = ({
  draw,
  draws,
}: {
  draw: LootDrawResponseDto;
  draws: ReturnType<typeof useLootDraws>;
}) => {
  const { t } = useTranslation();
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { guildId, voidDraw } = draws;

  if (!isOpen) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
        <Ban className="size-4" />
        {t("loots.details.draw.voidTitle")}
      </Button>
    );
  }

  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();

        if (!guildId || !reason.trim()) return;

        voidDraw.mutate(
          {
            pathParams: { guildId, lootId: draw.lootId, drawId: draw.id },
            data: { reason: reason.trim() },
          },
          { onError: () => toast.error(t("loots.details.draw.voidError")) },
        );
      }}
    >
      <Label htmlFor={id}>{t("loots.details.draw.voidReason")}</Label>
      <Textarea
        id={id}
        autoFocus
        className="min-h-16"
        maxLength={MAX_REASON_LENGTH}
        placeholder={t("loots.details.draw.voidPlaceholder")}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        {t("loots.details.draw.voidHint")}
      </p>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          variant="destructive"
          size="sm"
          disabled={!reason.trim() || voidDraw.isPending}
          loading={voidDraw.isPending}
        >
          {t("loots.details.draw.voidSubmit")}
        </Button>
      </div>
    </form>
  );
};
