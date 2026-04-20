import { createActivityDetailsRoutes } from "./routes/activity-details.routes.js";
import { createActivityListRoutes } from "./routes/activity-list.routes.js";
import { createActivitySuggestionsRoutes } from "./routes/activity-suggestions.routes.js";
import {
  createActivityRouteGroup,
  type ActivityRoutesDependencies,
} from "./routes/route-helpers.js";

export function createActivityRoutes(dependencies: ActivityRoutesDependencies) {
  const routes = createActivityRouteGroup();

  routes.route("/", createActivityListRoutes(dependencies));
  routes.route("/", createActivitySuggestionsRoutes(dependencies));
  routes.route("/", createActivityDetailsRoutes(dependencies));

  return routes;
}
