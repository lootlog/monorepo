import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Textarea } from "@lootlog/ui/components/textarea";
import { formatPoints, formatSignedPoints } from "../../utils/format-points";
import { parseEditablePoints } from "../../utils/parse-editable-points";

interface ManualPointsEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  currentPoints: number;
  isPending?: boolean;
  onSubmit: (values: {
    pointsDelta: number;
    comment?: string;
  }) => Promise<void>;
}

export const ManualPointsEditDialog = ({
  open,
  onOpenChange,
  title,
  description,
  currentPoints,
  isPending = false,
  onSubmit,
}: ManualPointsEditDialogProps) => {
  const { t } = useTranslation();
  const [pointsDeltaValue, setPointsDeltaValue] = useState("");
  const [commentValue, setCommentValue] = useState("");
  const pointsInputId = useId();
  const commentInputId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    setPointsDeltaValue("");
    setCommentValue("");
  }, [open]);

  const parsedPointsDelta = parseEditablePoints(pointsDeltaValue);
  const nextPoints =
    parsedPointsDelta === null
      ? currentPoints
      : Math.round((currentPoints + parsedPointsDelta) * 10000) / 10000;
  const isSubmitDisabled =
    parsedPointsDelta === null || parsedPointsDelta === 0 || isPending;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (parsedPointsDelta === null || parsedPointsDelta === 0) {
      return;
    }

    await onSubmit({
      pointsDelta: parsedPointsDelta,
      comment: commentValue,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 overflow-hidden p-0">
        <DialogHeader className="gap-2 px-4 pt-4 pb-3">
          <DialogTitle className="px-0 pt-0">{title}</DialogTitle>
          <DialogDescription className="px-0">{description}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4 px-4 pb-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label
              htmlFor={pointsInputId}
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              {t("events.points.deltaLabel")}
            </Label>
            <Input
              id={pointsInputId}
              type="text"
              inputMode="decimal"
              value={pointsDeltaValue}
              onChange={(event) => setPointsDeltaValue(event.target.value)}
              placeholder={t("events.points.deltaPlaceholder")}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {t("events.points.currentValueLabel")}
              </p>
              <p className="font-semibold">{formatPoints(currentPoints)}</p>
            </div>
            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {t("events.points.deltaPreviewLabel")}
              </p>
              <p className="font-semibold">
                {parsedPointsDelta === null
                  ? t("events.points.previewUnavailable")
                  : formatSignedPoints(parsedPointsDelta)}
              </p>
            </div>
            <div className="rounded-md border border-border/60 bg-primary/5 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {t("events.points.resultValueLabel")}
              </p>
              <p className="font-semibold text-primary">
                {formatPoints(nextPoints)}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor={commentInputId}
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              {t("events.points.commentLabel")}
            </Label>
            <Textarea
              id={commentInputId}
              value={commentValue}
              onChange={(event) => setCommentValue(event.target.value)}
              placeholder={t("events.points.commentPlaceholder")}
              maxLength={500}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
