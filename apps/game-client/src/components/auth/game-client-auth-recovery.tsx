import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

type Props = {
  actionPending?: boolean;
  mode: "checking" | "reauth" | "retry";
  onAction?: () => void;
};

export const GameClientAuthRecovery: React.FC<Props> = ({
  actionPending = false,
  mode,
  onAction,
}) => {
  const { t } = useTranslation();

  return (
    <div className="ll:pointer-events-auto ll:absolute ll:left-1/2 ll:top-4 ll:w-72 ll:-translate-x-1/2 ll:rounded-md ll:border ll:border-gray-500 ll:bg-gray-950/95 ll:p-3 ll:text-white ll:shadow-xl">
      <div className="ll:flex ll:flex-col ll:gap-2">
        <strong className="ll:text-xs ll:font-semibold">
          {t(`common.auth.${mode}.title`)}
        </strong>
        <p className="ll:text-[11px] ll:leading-4 ll:text-gray-300">
          {t(`common.auth.${mode}.description`)}
        </p>
        {onAction ? (
          <Button
            className="ll:w-full"
            disabled={actionPending}
            onClick={onAction}
          >
            {t(
              mode === "retry"
                ? "common.auth.retryButton"
                : "common.auth.reconnect",
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
