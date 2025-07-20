import { Routes, Route } from "react-router-dom";
import { GuildLayout } from "@/components/layout/guild-layout";
import { Init } from "@/screens/init/init";
import { Timers } from "@/screens/timers/timers";
import { Reservations } from "@/screens/reservations/reservations";
import { Stats } from "@/screens/stats/stats";
import { Layout } from "@/components/layout/layout";
import { SignIn } from "@/screens/signin/signin";
import { Home } from "@/screens/home/home";
import { Guild } from "@/screens/guild/guild";
import { SettingsLayout } from "@/components/layout/settings-layout";
import { GeneralSettings } from "@/screens/general-settings/general-settings";
import { RolesSettings } from "@/screens/roles-settings/roles-settings";
import { AuthenticationGuard } from "@/components/auth/authentication-guard";
import { NpcSettings } from "@/screens/lootlog-settings/npc-settings";
import { MembersSettings } from "@/screens/members-settings/members-settings";

export const Navigation = () => {
  return (
    <AuthenticationGuard>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="/@me" element={<Home />} />
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
