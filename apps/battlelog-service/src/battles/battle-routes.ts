import { createBattleAnalyticsRoutes } from "./routes/battle-analytics.routes.js";
import { createBattleDetailsRoutes } from "./routes/battle-details.routes.js";
import { createMyBattlesRoutes } from "./routes/my-battles.routes.js";
import { createPublicBattlesRoutes } from "./routes/public-battles.routes.js";
import {
  createBattleRouteGroup,
  type BattleRoutesDependencies,
} from "./routes/route-helpers.js";

export function createBattleRoutes(dependencies: BattleRoutesDependencies) {
  const routes = createBattleRouteGroup();

  routes.route("/", createPublicBattlesRoutes(dependencies));
  routes.route("/", createMyBattlesRoutes(dependencies));
  routes.route("/", createBattleAnalyticsRoutes(dependencies));
  routes.route("/", createBattleDetailsRoutes(dependencies));

  return routes;
}
