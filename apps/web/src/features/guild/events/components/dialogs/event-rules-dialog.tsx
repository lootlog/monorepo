import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { useTranslation } from "react-i18next";
import { IconDialogHeader } from "@/components/common/icon-dialog-header";
import { Dialog, DialogContent } from "@lootlog/ui/components/dialog";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { BookOpen, BookText, Scale } from "lucide-react";
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
        <IconDialogHeader
          icon={BookText}
          title={t("events.rulesDialog.title")}
          description={eventName}
        />

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-5">
            <div className="space-y-2">
              <SectionCardHeader
                icon={BookOpen}
                title={t("events.rulesDialog.rulebookTitle")}
              />
              {hasRulebook ? (
                <div className="p-3">
                  <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                    {rulebookMarkdown}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("events.rulesDialog.noRulebook")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <SectionCardHeader
                icon={Scale}
                title={t("events.rulesDialog.scoringTitle")}
              />
              <div className="p-3">
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
