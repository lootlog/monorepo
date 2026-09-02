# @lootlog/traffic-splitter

## 0.0.2

### Patch Changes

- 0c6ae17: Correct workspace dependency ownership, standardize quality and database command interfaces, and align package build metadata with production artifacts.

## 0.0.1

### Patch Changes

- a9b615c: Namespace static assets and manage the shared development and production
  traffic-splitter code from the repository. Keep the Workers independently
  deployable, promote the production splitter before frontend artifacts, and
  verify public CSS and JavaScript before closing the rollback boundary.
