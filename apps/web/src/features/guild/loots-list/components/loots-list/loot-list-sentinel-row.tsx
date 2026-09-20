import { Spinner } from "@lootlog/ui/components/spinner";

type Props = {
  hasNextPage: boolean;
  loadingLabel: string;
  endLabel: string;
};

/** The final virtual row: a loader while pages remain, otherwise the end note. */
export const LootListSentinelRow = ({
  hasNextPage,
  loadingLabel,
  endLabel,
}: Props) => (
  <div
    role="status"
    className="flex h-16 items-center justify-center gap-3 rounded-xl border border-border/50 bg-card/30 text-sm text-muted-foreground"
  >
    {hasNextPage ? (
      <>
        <Spinner className="size-5 text-primary" />
        <span className="font-medium">{loadingLabel}</span>
      </>
    ) : (
      <span className="text-xs">{endLabel}</span>
    )}
  </div>
);
