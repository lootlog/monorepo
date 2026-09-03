import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { BookOpen, Scale } from "lucide-react";
import { EventScoringRulesSummary } from "./event-scoring-rules-summary";
import type {
  EventScoringMode,
  EventScoringRules,
} from "@lootlog/domain/scoring";

interface EventRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventName: string;
  rulebookMarkdown?: string | null;
  scoringMode: EventScoringMode;
  scoringRules: EventScoringRules | null;
}

export const EventRulesDialog = ({
  open,
  onOpenChange,
  eventName,
  rulebookMarkdown,
  scoringMode,
  scoringRules,
}: EventRulesDialogProps) => {
  const { t } = useTranslation();
  const hasRulebook = Boolean(
    rulebookMarkdown && rulebookMarkdown.trim().length > 0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-4 border-b bg-muted/30 shrink-0">
          <DialogTitle className="text-base">
            {t("events.rulesDialog.title", "Zasady eventu")}
          </DialogTitle>
          <DialogDescription className="text-xs mt-0.5">
            {eventName}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="size-3.5" />
                {t("events.rulesDialog.rulebookTitle", "Regulamin")}
              </p>
              {hasRulebook ? (
                <div className="rounded-lg border bg-muted/20 p-3">
                  <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                    {rulebookMarkdown}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t(
                    "events.rulesDialog.noRulebook",
                    "Brak opisanego regulaminu dla tego eventu.",
                  )}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Scale className="size-3.5" />
                {t("events.rulesDialog.scoringTitle", "Zasady punktacji")}
              </p>
              <div className="rounded-lg border bg-muted/20 p-3">
                <EventScoringRulesSummary
                  scoringMode={scoringMode}
                  rules={scoringRules}
                  t={t}
                />
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
