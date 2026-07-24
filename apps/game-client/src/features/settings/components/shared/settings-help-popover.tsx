import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CircleHelp } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SettingsHelpPopoverProps {
  description: string;
  recommendation?: string;
  example?: string;
  dependency?: string;
}

export const SettingsHelpPopover = ({
  dependency,
  description,
  example,
  recommendation,
}: SettingsHelpPopoverProps) => {
  const { t } = useTranslation();

  return (
    <Popover>
      <PopoverTrigger
        aria-label={t("settings.help.open")}
        className="ll:ml-1 ll:inline-flex ll:size-4 ll:items-center ll:justify-center ll:border-0 ll:bg-transparent ll:p-0 ll:text-gray-400 ll-custom-cursor-pointer ll:hover:text-purple-300"
      >
        <CircleHelp className="ll:size-3.5" />
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        className="ll:w-56 ll:space-y-2 ll:text-[11px] ll:leading-4"
      >
        <p className="ll:m-0 ll:text-gray-200">{description}</p>
        {dependency ? (
          <div>
            <strong className="ll:text-gray-300">
              {t("settings.help.dependency")}
            </strong>{" "}
            <span className="ll:text-gray-400">{dependency}</span>
          </div>
        ) : null}
        {recommendation ? (
          <div>
            <strong className="ll:text-purple-300">
              {t("settings.help.recommendation")}
            </strong>{" "}
            <span className="ll:text-gray-300">{recommendation}</span>
          </div>
        ) : null}
        {example ? (
          <div>
            <strong className="ll:text-gray-300">
              {t("settings.help.example")}
            </strong>{" "}
            <span className="ll:text-gray-400">{example}</span>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};
