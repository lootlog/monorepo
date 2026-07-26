import { ROUTES } from "@/config/routes";
import type { NavigationInfo } from "./get-navigation-info";

type GetUserNavigationInfoArgs = {
  battleLabel?: string;
  path: string;
  t: (key: string, options?: Record<string, unknown>) => string;
};

function normalizePath(path: string) {
  if (path.length <= 1) {
    return path;
  }

  return path.replace(/\/$/, "");
}

export function getUserNavigationInfo({
  battleLabel,
  path,
  t,
}: GetUserNavigationInfoArgs): NavigationInfo {
  const normalizedPath = normalizePath(path);

  if (normalizedPath === ROUTES.user.dashboard) {
    return {
      breadcrumbs: [{ label: t("layout.navigation.dashboard"), path: null }],
      showBack: false,
    };
  }

  if (normalizedPath === ROUTES.user.battlePanel.base) {
    return {
      breadcrumbs: [{ label: t("layout.navigation.battlePanel"), path: null }],
      showBack: false,
    };
  }

  if (normalizedPath === ROUTES.user.battlePanel.statistics) {
    return {
      breadcrumbs: [
        {
          label: t("layout.navigation.battlePanel"),
          path: ROUTES.user.battlePanel.base,
        },
        { label: t("layout.breadcrumbs.statistics"), path: null },
      ],
      showBack: true,
      backPath: ROUTES.user.battlePanel.base,
    };
  }

  if (normalizedPath === ROUTES.user.battlePanel.abyss) {
    return {
      breadcrumbs: [
        {
          label: t("layout.navigation.battlePanel"),
          path: ROUTES.user.battlePanel.base,
        },
        { label: t("layout.breadcrumbs.abyss"), path: null },
      ],
      showBack: true,
      backPath: ROUTES.user.battlePanel.base,
    };
  }

  if (normalizedPath === ROUTES.user.battlePanel.h2h) {
    return {
      breadcrumbs: [
        {
          label: t("layout.navigation.battlePanel"),
          path: ROUTES.user.battlePanel.base,
        },
        {
          label: t("layout.breadcrumbs.statistics"),
          path: ROUTES.user.battlePanel.statistics,
        },
        { label: t("layout.breadcrumbs.headToHead"), path: null },
      ],
      showBack: true,
      backPath: ROUTES.user.battlePanel.statistics,
    };
  }

  if (normalizedPath === ROUTES.user.battlePanel.matchmakingH2h) {
    return {
      breadcrumbs: [
        {
          label: t("layout.navigation.battlePanel"),
          path: ROUTES.user.battlePanel.base,
        },
        {
          label: t("layout.breadcrumbs.abyss"),
          path: ROUTES.user.battlePanel.abyss,
        },
        { label: t("layout.breadcrumbs.abyssHeadToHead"), path: null },
      ],
      showBack: true,
      backPath: ROUTES.user.battlePanel.abyss,
    };
  }

  if (
    normalizedPath.startsWith(
      `${ROUTES.user.battlePanel.statistics}/player-vs-player/`,
    )
  ) {
    return {
      breadcrumbs: [
        {
          label: t("layout.navigation.battlePanel"),
          path: ROUTES.user.battlePanel.base,
        },
        {
          label: t("layout.breadcrumbs.statistics"),
          path: ROUTES.user.battlePanel.statistics,
        },
        { label: t("layout.breadcrumbs.playerVsPlayer"), path: null },
      ],
      showBack: true,
      backPath: ROUTES.user.battlePanel.statistics,
    };
  }

  const battlesDetailsPath = `${ROUTES.user.battlePanel.base}/battles`;

  if (normalizedPath.startsWith(`${battlesDetailsPath}/`)) {
    const battleId = normalizedPath.split("/").pop();
    if (battleId) {
      return {
        breadcrumbs: [
          {
            label: t("layout.navigation.battlePanel"),
            path: ROUTES.user.battlePanel.base,
          },
          {
            label: t("layout.breadcrumbs.battles"),
            path: ROUTES.user.battlePanel.base,
          },
          {
            label:
              battleLabel ??
              t("battlePanel.navigation.battleFallback", {
                id: battleId,
              }),
            path: null,
          },
        ],
        showBack: true,
        backPath: ROUTES.user.battlePanel.base,
      };
    }
  }

  if (normalizedPath === ROUTES.user.settings.account) {
    return {
      breadcrumbs: [
        {
          label: t("layout.navigation.settings"),
          path: ROUTES.user.settings.base,
        },
        { label: t("settings.account.title"), path: null },
      ],
      showBack: true,
      backPath: ROUTES.user.settings.base,
    };
  }

  if (normalizedPath === ROUTES.user.settings.appearance) {
    return {
      breadcrumbs: [
        {
          label: t("layout.navigation.settings"),
          path: ROUTES.user.settings.base,
        },
        { label: t("settings.appearance.title"), path: null },
      ],
      showBack: true,
      backPath: ROUTES.user.settings.base,
    };
  }

  if (normalizedPath === ROUTES.user.settings.servers) {
    return {
      breadcrumbs: [
        {
          label: t("layout.navigation.settings"),
          path: ROUTES.user.settings.base,
        },
        { label: t("settings.servers.title"), path: null },
      ],
      showBack: true,
      backPath: ROUTES.user.settings.base,
    };
  }

  if (normalizedPath.startsWith(ROUTES.user.settings.base)) {
    return {
      breadcrumbs: [{ label: t("layout.navigation.settings"), path: null }],
      showBack: false,
    };
  }

  if (normalizedPath.startsWith(ROUTES.user.notifications.base)) {
    return {
      breadcrumbs: [
        { label: t("layout.navigation.notifications"), path: null },
      ],
      showBack: false,
    };
  }

  if (normalizedPath === "/@me/kills") {
    return {
      breadcrumbs: [
        {
          label: t("layout.navigation.dashboard"),
          path: ROUTES.user.dashboard,
        },
        { label: t("layout.breadcrumbs.npcRanking"), path: null },
      ],
      showBack: true,
      backPath: ROUTES.user.dashboard,
    };
  }

  return {
    breadcrumbs: [{ label: t("layout.navigation.dashboard"), path: null }],
    showBack: false,
  };
}
