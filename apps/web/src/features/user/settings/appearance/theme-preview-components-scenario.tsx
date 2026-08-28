import { useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lootlog/ui/components/alert";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Slider } from "@lootlog/ui/components/slider";
import { Switch } from "@lootlog/ui/components/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lootlog/ui/components/tabs";
import { Textarea } from "@lootlog/ui/components/textarea";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { Info, LayoutGrid, List, Rows3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@lootlog/ui/lib/utils";
import type { ThemePreviewViewport } from "./theme-builder-preview-types";
import { ThemePreviewSettingsPage } from "./theme-preview-settings-page";

interface ThemePreviewComponentsScenarioProps {
  viewport: ThemePreviewViewport;
}

export const ThemePreviewComponentsScenario = ({
  viewport,
}: ThemePreviewComponentsScenarioProps) => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState(true);

  return (
    <ThemePreviewSettingsPage
      titleKey="settings.appearance.preview.components.pageTitle"
      descriptionKey="settings.appearance.preview.components.pageDescription"
    >
      <div
        className={cn("grid gap-4", viewport === "desktop" && "grid-cols-2")}
      >
        <Card className="py-4">
          <CardHeader className="px-4">
            <CardTitle>
              {t("settings.appearance.preview.components.buttons")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 px-4">
            <Button>
              {t("settings.appearance.preview.components.primary")}
            </Button>
            <Button variant="secondary">
              {t("settings.appearance.preview.components.secondary")}
            </Button>
            <Button variant="outline">
              {t("settings.appearance.preview.components.outline")}
            </Button>
            <Button variant="ghost">
              {t("settings.appearance.preview.components.ghost")}
            </Button>
            <Button variant="destructive">
              {t("settings.appearance.preview.components.destructive")}
            </Button>
            <Button disabled>
              {t("settings.appearance.preview.components.disabled")}
            </Button>
            <div className="flex w-full flex-wrap gap-2 pt-2">
              <Badge>{t("settings.appearance.preview.components.new")}</Badge>
              <Badge variant="secondary">
                {t("settings.appearance.preview.components.ready")}
              </Badge>
              <Badge variant="outline">
                {t("settings.appearance.preview.components.draft")}
              </Badge>
              <Badge variant="destructive">
                {t("settings.appearance.preview.components.error")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="px-4">
            <CardTitle>
              {t("settings.appearance.preview.components.form")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4">
            <Label htmlFor="preview-name">
              {t("settings.appearance.preview.components.name")}
            </Label>
            <Input
              id="preview-name"
              defaultValue={t(
                "settings.appearance.preview.components.nameValue",
              )}
            />
            <Textarea
              placeholder={t(
                "settings.appearance.preview.components.description",
              )}
            />
            <div className="flex items-center gap-2">
              <Checkbox id="preview-checkbox" defaultChecked />
              <Label htmlFor="preview-checkbox">
                {t("settings.appearance.preview.components.remember")}
              </Label>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="preview-switch">
                {t("settings.appearance.preview.components.notifications")}
              </Label>
              <Switch
                id="preview-switch"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
            <Slider defaultValue={[62]} max={100} />
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="px-4">
            <CardTitle>
              {t("settings.appearance.preview.components.selection")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4">
            <ToggleGroup defaultValue={["grid"]}>
              <ToggleGroupItem
                value="grid"
                aria-label={t("settings.appearance.preview.components.grid")}
              >
                <LayoutGrid />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="rows"
                aria-label={t("settings.appearance.preview.components.rows")}
              >
                <Rows3 />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="list"
                aria-label={t("settings.appearance.preview.components.list")}
              >
                <List />
              </ToggleGroupItem>
            </ToggleGroup>
            <Tabs defaultValue="general">
              <TabsList>
                <TabsTrigger value="general">
                  {t("settings.appearance.preview.components.general")}
                </TabsTrigger>
                <TabsTrigger value="access">
                  {t("settings.appearance.preview.components.access")}
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value="general"
                className="pt-3 text-sm text-muted-foreground"
              >
                {t("settings.appearance.preview.components.generalDescription")}
              </TabsContent>
              <TabsContent
                value="access"
                className="pt-3 text-sm text-muted-foreground"
              >
                {t("settings.appearance.preview.components.accessDescription")}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Alert>
          <Info />
          <AlertTitle>
            {t("settings.appearance.preview.components.alertTitle")}
          </AlertTitle>
          <AlertDescription>
            {t("settings.appearance.preview.components.alertDescription")}
          </AlertDescription>
        </Alert>
      </div>
    </ThemePreviewSettingsPage>
  );
};
