import { Routes, Route } from "react-router-dom";
import { GuildLayout } from "@/components/layout/guild-layout";
import { Init } from "@/screens/init/init";
import { Timers } from "@/screens/timers/timers";
import { Reservations } from "@/screens/reservations/reservations";
import { Stats } from "@/screens/stats/stats";
import { Layout } from "@/components/layout/layout";
import { SignIn } from "@/screens/signin/signin";

import { Guild } from "@/screens/guild/guild";
import { SettingsLayout } from "@/components/layout/settings-layout";
import { GeneralSettings } from "@/screens/general-settings/general-settings";
import { RolesSettings } from "@/screens/roles-settings/roles-settings";
import { AuthenticationGuard } from "@/components/auth/authentication-guard";
import { NpcSettings } from "@/screens/lootlog-settings/npc-settings";
import { MembersSettings } from "@/screens/members-settings/members-settings";
import { HomeLayout } from "@/components/layout/home-layout";
import { UserSettings } from "@/screens/user-settings/user-settings";
import { Home } from "@/screens/home/home";
import { UserSettingsLayout } from "@/components/layout/user-settings-layout";
import { BattlePanelDashboard } from "@/features/battle-panel/battle-panel-dashboard/battle-panel-dashboard";
import { BattlePanelBattlesList } from "@/features/battle-panel/battle-panel-battles-list/battle-panel-battles-list";
import { BattlePanelLayout } from "@/features/battle-panel/battle-panel-layout/battle-panel-layout";
import { BattlePanelSingleBattle } from "@/features/battle-panel/battle-panel-single-battle/battle-panel-single-battle";

export const Navigation = () => {
  return (
    <AuthenticationGuard>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="/@me" element={<HomeLayout />}>
            <Route path="/@me" element={<Home />} />
            <Route path="/@me/battle-panel" element={<BattlePanelLayout />}>
              <Route
                path="/@me/battle-panel"
                element={<BattlePanelDashboard />}
              />
              <Route
                path="/@me/battle-panel/stats"
                element={<BattlePanelDashboard />}
              />
              <Route
                path="/@me/battle-panel/battles"
                element={<BattlePanelBattlesList />}
              />
              <Route
                path="/@me/battle-panel/battles/:battleId"
                element={<BattlePanelSingleBattle />}
              />
            </Route>
            <Route path="/@me/settings" element={<UserSettingsLayout />}>
              <Route path="/@me/settings" element={<UserSettings />} />
              <Route
                path="/@me/settings/appearance"
                element={<UserSettings />}
              />
            </Route>
          </Route>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/init" element={<Init />} />
          <Route path="/:guildId" element={<GuildLayout />}>
            <Route path="/:guildId" element={<Guild />} />
            <Route path="/:guildId/timers" element={<Timers />} />
            <Route path="/:guildId/reservations" element={<Reservations />} />
            <Route path="/:guildId/stats" element={<Stats />} />
            <Route path="/:guildId/settings" element={<SettingsLayout />}>
              <Route path="/:guildId/settings" element={<GeneralSettings />} />
              <Route
                path="/:guildId/settings/roles"
                element={<RolesSettings />}
              />
              <Route
                path="/:guildId/settings/roles/:roleId"
                element={<RolesSettings />}
              />
              <Route path="/:guildId/settings/npcs" element={<NpcSettings />} />
              <Route
                path="/:guildId/settings/members"
                element={<MembersSettings />}
              />
            </Route>
          </Route>
        </Route>
      </Routes>
    </AuthenticationGuard>
  );
};
