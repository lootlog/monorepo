import { cn } from "@/lib/utils";
import { AlertCircle, Loader2 } from "lucide-react";
import type { FC } from "react";

type SettingsSyncStatusProps = {
  status: "idle" | "loading" | "saving" | "error";
  savingLabel: string;
  syncingLabel: string;
  errorLabel: string;
  className?: string;
};

export const SettingsSyncStatus: FC<SettingsSyncStatusProps> = ({
  status,
  savingLabel,
  syncingLabel,
  errorLabel,
  className,
}) => {
  if (status === "idle") {
    return null;
  }

  const isError = status === "error";

  return (
    <div
      className={cn(
        "ll:pointer-events-auto ll:-mt-1 ll:inline-flex ll:min-h-8 ll:min-w-36 ll:items-center ll:justify-center ll:gap-2 ll:rounded-sm ll:border ll:px-3 ll:py-1.5 ll:text-xs ll:font-semibold ll:leading-none ll:whitespace-nowrap ll:shadow-sm",
        isError
          ? "ll:border-red-500/60 ll:bg-red-500/12 ll:text-red-200"
          : "ll:border-gray-500 ll:bg-gray-900/95 ll:text-gray-100",
        className,
      )}
    >
      {isError ? (
        <>
          <AlertCircle className="ll:size-4" />
          <span>{errorLabel}</span>
        </>
      ) : (
        <>
          <Loader2 className="ll:size-4 ll:animate-spin" />
          <span>{status === "saving" ? savingLabel : syncingLabel}</span>
        </>
      )}
    </div>
  );
};
