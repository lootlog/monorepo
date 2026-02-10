import { ROUTES } from "@/config/routes";
import { useUserAddons } from "@/hooks/api/user/use-user-addons";
import { isDevMode } from "@/lib/utils/is-dev-mode";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import { Link } from "@tanstack/react-router";
import { ArrowRight, PackageCheck, PackageX, Plus } from "lucide-react";

export const AddonsPage = () => {
  const { data: addons = [], isLoading: addonsLoading } = useUserAddons();

  if (!isDevMode) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Addons</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This page is available only in development mode.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4">
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Dodatki</h1>
            <p className="text-sm text-muted-foreground">
              Zarzadzaj swoimi addonami i otwieraj je w osobnym edytorze.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">development only</Badge>
            <Button asChild>
              <Link to={ROUTES.user.addon("new")}>
                <Plus className="mr-1 h-4 w-4" />
                Nowy addon
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Twoje dodatki</CardTitle>
          </CardHeader>
          <CardContent>
            {addonsLoading ? (
              <p className="text-sm text-muted-foreground">Loading addons...</p>
            ) : addons.length === 0 ? (
              <div className="flex flex-col items-start gap-3 rounded-md border border-dashed p-4">
                <p className="text-sm text-muted-foreground">
                  Nie masz jeszcze zadnych addonow.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to={ROUTES.user.addon("new")}>
                    <Plus className="mr-1 h-4 w-4" />
                    Utworz pierwszy addon
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {addons.map((addon) => (
                  <div
                    key={addon.id}
                    className="rounded-md border p-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{addon.name}</p>
                      <div className="flex shrink-0 items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {addon.language === "TYPESCRIPT" ? "TS" : "JS"}
                        </Badge>
                        {addon.installed ? (
                          <Badge className="text-[10px]">
                            <PackageCheck className="mr-1 h-3 w-3" />
                            Installed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            <PackageX className="mr-1 h-3 w-3" />
                            Draft
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="truncate text-xs text-muted-foreground">
                      Runtime ID: {addon.runtimeId}
                    </p>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Updated: {new Date(addon.updatedAt).toLocaleString()}
                    </p>

                    <Button asChild size="sm" variant="outline">
                      <Link to={ROUTES.user.addon(addon.id)}>
                        Otworz edytor
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
