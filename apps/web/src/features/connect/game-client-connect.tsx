import { NoticeCard } from "@/components/common/notice-card";
import { FullScreenLoading } from "@/components/ui/full-screen-loading";
import { useDiscordSignIn } from "@/hooks/auth/use-discord-sign-in";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
import { authClient } from "@/lib/auth-client";
import type { GameClientHandoffMessage } from "@lootlog/protocol/game-client-handoff";
import { Button } from "@lootlog/ui/components/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { CircleCheck, Gamepad2, LogIn, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const noticeIcon = {
  attention: <TriangleAlert className="size-8 text-amber-500" aria-hidden />,
  connected: <CircleCheck className="size-8 text-emerald-500" aria-hidden />,
  game: <Gamepad2 className="size-8 text-primary" aria-hidden />,
  signIn: <LogIn className="size-8 text-primary" aria-hidden />,
};

/**
 * Opened by the Game client in a popup. The web app is first-party here, so
 * it can read the session even when the browser withholds Lootlog cookies
 * from the Margonem page, and hands the opener a short-lived code that the
 * Game client redeems for a session cookie in its own partition.
 */
export const GameClientConnect = () => {
  const { t } = useTranslation();
  const { origin, state } = useSearch({ from: "/connect" });
  const session = useQuery(sessionQueryOptions);
  const discord = useDiscordSignIn();
  const started = useRef(false);
  // A Discord login page with its own opener policy severs it for good.
  const [opener] = useState<Window | null>(() => window.opener);

  const handoff = useMutation({
    mutationFn: async ({
      gameOrigin,
      requestState,
    }: {
      gameOrigin: string;
      requestState: string;
    }) => {
      const { data, error } = await authClient.$fetch<{ code: string }>(
        "/game-client/handoff",
        { method: "POST", body: { origin: gameOrigin } },
      );

      if (error || !data) throw new Error("Game client handoff failed");

      const message: GameClientHandoffMessage = {
        type: "lootlog:game-client-handoff",
        state: requestState,
        code: data.code,
      };

      // The Game client accepts this message only from the web app origin.
      opener?.postMessage(message, gameOrigin);
    },
    onSuccess: () => window.close(),
  });

  const signedIn = Boolean(session.data?.data?.session);
  const { mutate } = handoff;

  useEffect(() => {
    if (!signedIn || opener === null || !origin || !state || started.current)
      return;

    started.current = true;
    mutate({ gameOrigin: origin, requestState: state });
  }, [mutate, opener, origin, signedIn, state]);

  if (!origin || !state)
    return (
      <div className="flex min-h-dvh bg-background">
        <NoticeCard
          headingLevel="h1"
          icon={noticeIcon.game}
          title={t("auth.connect.invalid.title")}
          description={t("auth.connect.invalid.description")}
        />
      </div>
    );

  if (session.isPending || handoff.isPending) return <FullScreenLoading />;

  if (session.isError || session.data?.error)
    return (
      <div className="flex min-h-dvh bg-background">
        <NoticeCard
          headingLevel="h1"
          icon={noticeIcon.attention}
          title={t("auth.unavailable.title")}
          description={t("auth.unavailable.description")}
        >
          <Button className="w-full" onClick={() => void session.refetch()}>
            {t("auth.unavailable.button")}
          </Button>
        </NoticeCard>
      </div>
    );

  if (!signedIn)
    return (
      <div className="flex min-h-dvh bg-background">
        <NoticeCard
          headingLevel="h1"
          icon={noticeIcon.signIn}
          title={t("auth.connect.signIn.title")}
          description={t(
            discord.hasError
              ? "auth.signin.failed"
              : "auth.connect.signIn.description",
          )}
        >
          <Button
            className="w-full"
            size="lg"
            loading={discord.isPending}
            onClick={() =>
              void discord.signIn({
                callbackURL: window.location.href,
                errorCallbackURL: window.location.href,
              })
            }
          >
            {t("auth.signin.submit")}
          </Button>
        </NoticeCard>
      </div>
    );

  if (opener === null)
    return (
      <div className="flex min-h-dvh bg-background">
        <NoticeCard
          headingLevel="h1"
          icon={noticeIcon.game}
          title={t("auth.connect.returnToGame.title")}
          description={t("auth.connect.returnToGame.description")}
        />
      </div>
    );

  if (handoff.isError)
    return (
      <div className="flex min-h-dvh bg-background">
        <NoticeCard
          headingLevel="h1"
          icon={noticeIcon.attention}
          title={t("auth.connect.failed.title")}
          description={t("auth.connect.failed.description")}
        >
          <Button
            className="w-full"
            onClick={() => mutate({ gameOrigin: origin, requestState: state })}
          >
            {t("auth.unavailable.button")}
          </Button>
        </NoticeCard>
      </div>
    );

  return (
    <div className="flex min-h-dvh bg-background">
      <NoticeCard
        headingLevel="h1"
        icon={noticeIcon.connected}
        title={t("auth.connect.connected.title")}
        description={t("auth.connect.connected.description")}
      />
    </div>
  );
};
