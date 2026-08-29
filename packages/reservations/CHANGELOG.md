# @lootlog/reservations

## 1.0.1

### Patch Changes

- fc87eab: Centralize Reservation settings defaults and time validation in a shared domain
  module. Keep Organization settings in the API database while making the Web
  form match the authoritative 60-second past-start grace and preserving existing
  Reservation mutation error contracts. Replace localized Reservation settings
  errors in the API with stable translation keys.
