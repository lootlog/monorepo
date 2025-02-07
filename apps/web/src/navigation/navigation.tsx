import { Routes, Route } from "react-router-dom";
import { Home } from "../screens/home/home";
import { Guild } from "../screens/guild/guild";
import { GuildLayout } from "components/layout/guild-layout";
import { Init } from "screens/init/init";
import { Timers } from "screens/timers/timers";
import { Reservations } from "screens/reservations/reservations";
import { Stats } from "screens/stats/stats";
import { Install } from "screens/install/install";
import { Settings } from "screens/settings/settings";
import { Layout } from "components/layout/layout";
import { SignIn } from "screens/signin/signin";

export const Navigation = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/init" element={<Init />} />
        <Route path="/:guildId" element={<GuildLayout />}>
          <Route path="/:guildId" element={<Guild />} />
          <Route path="/:guildId/timers" element={<Timers />} />
          <Route path="/:guildId/reservations" element={<Reservations />} />
          <Route path="/:guildId/stats" element={<Stats />} />
          <Route path="/:guildId/install" element={<Install />} />
          <Route path="/:guildId/settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  );
};
