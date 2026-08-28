import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lootlog/ui/components/alert";
import { Button } from "@lootlog/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@lootlog/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { Spinner } from "@lootlog/ui/components/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { CircleCheck, CircleX, Inbox, MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@lootlog/ui/lib/utils";
import type { ThemePreviewViewport } from "./theme-builder-preview-types";
import { ThemePreviewSettingsPage } from "./theme-preview-settings-page";

interface ThemePreviewStatesScenarioProps {
  viewport: ThemePreviewViewport;
}

export const ThemePreviewStatesScenario = ({
  viewport,
}: ThemePreviewStatesScenarioProps) => {
  const { t } = useTranslation();

  return (
    <ThemePreviewSettingsPage
      titleKey="settings.appearance.preview.states.pageTitle"
      descriptionKey="settings.appearance.preview.states.pageDescription"
    >
      <div
        className={cn("grid gap-4", viewport === "desktop" && "grid-cols-2")}
      >
        <div className="space-y-3">
          <Alert>
            <CircleCheck className="text-signal-ready" />
            <AlertTitle>
              {t("settings.appearance.preview.states.successTitle")}
            </AlertTitle>
            <AlertDescription>
              {t("settings.appearance.preview.states.successDescription")}
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <CircleX />
            <AlertTitle>
              {t("settings.appearance.preview.states.errorTitle")}
            </AlertTitle>
            <AlertDescription>
              {t("settings.appearance.preview.states.errorDescription")}
            </AlertDescription>
          </Alert>
          <Card className="py-4">
            <CardContent className="flex min-h-44 flex-col items-center justify-center gap-3 px-4 text-center">
              <Inbox className="size-8 text-muted-foreground" />
              <div>
                <p className="font-semibold">
                  {t("settings.appearance.preview.emptyTitle")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("settings.appearance.preview.emptyDescription")}
                </p>
              </div>
              <Button variant="outline">
                {t("settings.appearance.preview.states.refresh")}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="py-4">
          <CardHeader className="px-4">
            <CardTitle>
              {t("settings.appearance.preview.states.overlays")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 px-4">
            <Tooltip>
              <TooltipTrigger render={<Button variant="outline" />}>
                {t("settings.appearance.preview.states.tooltip")}
              </TooltipTrigger>
              <TooltipContent>
                {t("settings.appearance.preview.states.tooltipContent")}
              </TooltipContent>
            </Tooltip>

            <Popover>
              <PopoverTrigger render={<Button variant="secondary" />}>
                {t("settings.appearance.preview.states.popover")}
              </PopoverTrigger>
              <PopoverContent>
                <p className="text-sm font-medium">
                  {t("settings.appearance.preview.states.popoverTitle")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("settings.appearance.preview.states.popoverDescription")}
                </p>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    aria-label={t("settings.appearance.actions.more")}
                  />
                }
              >
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  {t("settings.appearance.preview.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  {t("settings.appearance.preview.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
              <DialogTrigger render={<Button />}>
                {t("settings.appearance.preview.states.dialog")}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {t("settings.appearance.preview.states.dialogTitle")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("settings.appearance.preview.states.dialogDescription")}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="p-4">
                  <Button variant="outline">{t("common.cancel")}</Button>
                  <Button>{t("common.save")}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="flex w-full items-center gap-2 rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">
              <Spinner />
              {t("settings.appearance.preview.states.loading")}
            </div>
          </CardContent>
        </Card>
      </div>
    </ThemePreviewSettingsPage>
  );
};
