import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface StatCardProps {
  title: string;
  description: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
  className?: string;
}

export function StatCard({
  title,
  description,
  isLoading = false,
  isEmpty = false,
  emptyMessage = "Brak danych",
  children,
  className,
}: StatCardProps) {
  const { t } = useTranslation();
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex gap-2 flex-col">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent
        className={
          className && !isLoading && !isEmpty
            ? "flex-1 flex flex-col"
            : undefined
        }
      >
        {isLoading ? (
          <div className="h-72 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {t("battlePanel.statistics.loading")}
            </p>
          </div>
        ) : isEmpty ? (
          <div className="h-72 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
