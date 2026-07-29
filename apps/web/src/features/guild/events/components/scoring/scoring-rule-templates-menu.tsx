import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { LayoutTemplate } from "lucide-react";
import type { EventScoringRule } from "@lootlog/scoring";
import { SCORING_RULE_TEMPLATES } from "../../utils/scoring-rule-templates";

interface ScoringRuleTemplatesMenuProps {
  onSelectTemplate: (rule: EventScoringRule) => void;
}

export const ScoringRuleTemplatesMenu = ({
  onSelectTemplate,
}: ScoringRuleTemplatesMenuProps) => {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <LayoutTemplate className="size-3.5 mr-1.5" />
          {t("events.scoring.template.menuLabel")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {SCORING_RULE_TEMPLATES.map((template) => (
          <DropdownMenuItem
            key={template.id}
            onClick={() => onSelectTemplate(template.createRule())}
            className="flex flex-col items-start gap-0.5 py-2"
          >
            <span className="text-sm font-medium">{t(template.i18nKey)}</span>
            <span className="text-[11px] text-muted-foreground">
              {t(template.i18nDescriptionKey)}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
