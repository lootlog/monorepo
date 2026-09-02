/** Generated from the retired Nest controller signatures. */
export const controllerRoutes = {
  EventsAssignmentControllerAssignMember: {
    controller: "EventsAssignmentController",
    method: "assignMember",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "mapId",
      },
      {
        source: "payload",
      },
    ],
  },
  EventsAssignmentControllerSelfAssignMember: {
    controller: "EventsAssignmentController",
    method: "selfAssignMember",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "mapId",
      },
      {
        source: "caller",
        key: "member",
      },
      {
        source: "caller",
        key: "roles",
      },
      {
        source: "caller",
        key: "accessPolicy",
      },
    ],
  },
  EventsAssignmentControllerSelfUnassignMember: {
    controller: "EventsAssignmentController",
    method: "selfUnassignMember",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "mapId",
      },
      {
        source: "caller",
        key: "member",
      },
      {
        source: "caller",
        key: "roles",
      },
      {
        source: "caller",
        key: "accessPolicy",
      },
    ],
  },
  EventsAssignmentControllerAddHero: {
    controller: "EventsAssignmentController",
    method: "addHero",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "payload",
      },
    ],
  },
  EventsAssignmentControllerUpdateHero: {
    controller: "EventsAssignmentController",
    method: "updateHero",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "heroId",
      },
      {
        source: "payload",
      },
    ],
  },
  EventsAssignmentControllerDeleteHero: {
    controller: "EventsAssignmentController",
    method: "deleteHero",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "heroId",
      },
    ],
  },
  EventsAssignmentControllerAddMap: {
    controller: "EventsAssignmentController",
    method: "addMap",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "heroId",
      },
      {
        source: "payload",
      },
    ],
  },
  EventsAssignmentControllerDeleteMap: {
    controller: "EventsAssignmentController",
    method: "deleteMap",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "heroId",
      },
      {
        source: "params",
        key: "mapId",
      },
    ],
  },
  EventsAssignmentControllerGetLocations: {
    controller: "EventsAssignmentController",
    method: "getLocations",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "heroId",
      },
      {
        source: "caller",
        key: "roles",
      },
      {
        source: "caller",
        key: "accessPolicy",
      },
    ],
  },
  EventsAssignmentControllerCreateLocation: {
    controller: "EventsAssignmentController",
    method: "createLocation",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "heroId",
      },
      {
        source: "payload",
      },
    ],
  },
  EventsAssignmentControllerUpdateLocation: {
    controller: "EventsAssignmentController",
    method: "updateLocation",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "heroId",
      },
      {
        source: "params",
        key: "locationId",
      },
      {
        source: "payload",
      },
    ],
  },
  EventsAssignmentControllerDeleteLocation: {
    controller: "EventsAssignmentController",
    method: "deleteLocation",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "heroId",
      },
      {
        source: "params",
        key: "locationId",
      },
    ],
  },
  EventsAssignmentControllerReorderLocations: {
    controller: "EventsAssignmentController",
    method: "reorderLocations",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "heroId",
      },
      {
        source: "payload",
      },
    ],
  },
  EventsAssignmentControllerAssignMapToLocation: {
    controller: "EventsAssignmentController",
    method: "assignMapToLocation",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "heroId",
      },
      {
        source: "params",
        key: "mapId",
      },
      {
        source: "payload",
      },
    ],
  },
  EventsAssignmentControllerUnassignMember: {
    controller: "EventsAssignmentController",
    method: "unassignMember",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "mapId",
      },
      {
        source: "query",
        key: "memberId",
      },
    ],
  },
  createEvent: {
    controller: "EventsCatalogController",
    method: "createEvent",
    arguments: [
      {
        source: "payload",
      },
      {
        source: "caller",
        key: "guild",
      },
    ],
  },
  listEvents: {
    controller: "EventsCatalogController",
    method: "getEvents",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "caller",
        key: "accessPolicy",
      },
      {
        source: "query",
        key: "world",
      },
      {
        source: "query",
        key: "activeOnly",
      },
      {
        source: "caller",
        key: "roles",
      },
    ],
  },
  showEvent: {
    controller: "EventsCatalogController",
    method: "getEvent",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "caller",
        key: "roles",
      },
      {
        source: "caller",
        key: "accessPolicy",
      },
    ],
  },
  showEventOverview: {
    controller: "EventsCatalogController",
    method: "getEventOverview",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "caller",
        key: "roles",
      },
      {
        source: "caller",
        key: "accessPolicy",
      },
    ],
  },
  showEventWrapped: {
    controller: "EventsCatalogController",
    method: "getWrapped",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "caller",
        key: "roles",
      },
      {
        source: "caller",
        key: "accessPolicy",
      },
    ],
  },
  listEventMaps: {
    controller: "EventsCatalogController",
    method: "getEventMaps",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "caller",
        key: "roles",
      },
      {
        source: "caller",
        key: "accessPolicy",
      },
    ],
  },
  updateEvent: {
    controller: "EventsCatalogController",
    method: "updateEvent",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "payload",
      },
    ],
  },
  recalculateEventPoints: {
    controller: "EventsCatalogController",
    method: "recalculatePoints",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
    ],
  },
  deleteEvent: {
    controller: "EventsCatalogController",
    method: "deleteEvent",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
    ],
  },
  EventsMonitoringControllerGetCoordination: {
    controller: "EventsMonitoringController",
    method: "getCoordination",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
    ],
  },
  EventsMonitoringControllerGetKillTimelineData: {
    controller: "EventsMonitoringController",
    method: "getKillTimelineData",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "heroId",
      },
      {
        source: "params",
        key: "killId",
      },
      {
        source: "caller",
        key: "roles",
      },
      {
        source: "caller",
        key: "accessPolicy",
      },
    ],
  },
  EventsMonitoringControllerGetHeroCoverageGaps: {
    controller: "EventsMonitoringController",
    method: "getHeroCoverageGaps",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "heroId",
      },
      {
        source: "caller",
        key: "roles",
      },
      {
        source: "caller",
        key: "accessPolicy",
      },
    ],
  },
  EventsMonitoringControllerGetMapCoverageGaps: {
    controller: "EventsMonitoringController",
    method: "getMapCoverageGaps",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "mapId",
      },
    ],
  },
  EventsMonitoringControllerGetActiveGapForMap: {
    controller: "EventsMonitoringController",
    method: "getActiveGapForMap",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "mapId",
      },
    ],
  },
  EventsMonitoringControllerGetActiveGapsForHero: {
    controller: "EventsMonitoringController",
    method: "getActiveGapsForHero",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "heroId",
      },
      {
        source: "caller",
        key: "roles",
      },
      {
        source: "caller",
        key: "accessPolicy",
      },
    ],
  },
  EventsMonitoringControllerGetHeroPresenceStats: {
    controller: "EventsMonitoringController",
    method: "getHeroPresenceStats",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "heroId",
      },
      {
        source: "caller",
        key: "roles",
      },
      {
        source: "caller",
        key: "accessPolicy",
      },
    ],
  },
  EventsMonitoringControllerGetHeroRespawnConfig: {
    controller: "EventsMonitoringController",
    method: "getHeroRespawnConfig",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "heroId",
      },
      {
        source: "caller",
        key: "roles",
      },
      {
        source: "caller",
        key: "accessPolicy",
      },
    ],
  },
  EventsMonitoringControllerCloseRespawnWindow: {
    controller: "EventsMonitoringController",
    method: "closeRespawnWindow",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "heroId",
      },
      {
        source: "payload",
      },
    ],
  },
  EventsMonitoringControllerOpenRespawnWindow: {
    controller: "EventsMonitoringController",
    method: "openRespawnWindow",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "heroId",
      },
      {
        source: "payload",
      },
    ],
  },
  listPinnedEvents: {
    controller: "EventsPinsController",
    method: "listPinnedEvents",
    arguments: [
      {
        source: "caller",
        key: "userId",
      },
      {
        source: "caller",
        key: "guild",
      },
    ],
  },
  pinEvent: {
    controller: "EventsPinsController",
    method: "pinEvent",
    arguments: [
      {
        source: "caller",
        key: "userId",
      },
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
    ],
  },
  unpinEvent: {
    controller: "EventsPinsController",
    method: "unpinEvent",
    arguments: [
      {
        source: "caller",
        key: "userId",
      },
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
    ],
  },
  listPendingParticipationConfirmations: {
    controller: "EventsRankingController",
    method: "getPendingParticipationConfirmations",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "caller",
        key: "member",
      },
    ],
  },
  acknowledgeExpiredParticipationConfirmations: {
    controller: "EventsRankingController",
    method: "acknowledgeExpiredParticipationConfirmations",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "caller",
        key: "member",
      },
      {
        source: "payload",
      },
    ],
  },
  confirmParticipationForKill: {
    controller: "EventsRankingController",
    method: "confirmParticipationForKill",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "killId",
      },
      {
        source: "caller",
        key: "member",
      },
    ],
  },
  listEventRanking: {
    controller: "EventsRankingController",
    method: "getRanking",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "caller",
        key: "roles",
      },
      {
        source: "caller",
        key: "accessPolicy",
      },
    ],
  },
  updateRankingPoints: {
    controller: "EventsRankingController",
    method: "updateRankingPoints",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "rankingId",
      },
      {
        source: "payload",
      },
      {
        source: "caller",
        key: "userId",
      },
    ],
  },
  listEventHeroTimers: {
    controller: "EventsRankingController",
    method: "getEventHeroTimers",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "query",
        key: "world",
      },
      {
        source: "caller",
        key: "roles",
      },
      {
        source: "caller",
        key: "accessPolicy",
      },
    ],
  },
  EventsRankingControllerGetEventHeroStats: {
    controller: "EventsRankingController",
    method: "getEventHeroStats",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "caller",
        key: "roles",
      },
      {
        source: "caller",
        key: "accessPolicy",
      },
    ],
  },
  EventsRankingControllerGetEventKillHistory: {
    controller: "EventsRankingController",
    method: "getEventKillHistory",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "caller",
        key: "accessPolicy",
      },
      {
        source: "query",
        key: "limit",
      },
      {
        source: "query",
        key: "cursor",
      },
      {
        source: "query",
        key: "heroId",
      },
      {
        source: "caller",
        key: "roles",
      },
    ],
  },
  EventsRankingControllerGetMemberKillHistory: {
    controller: "EventsRankingController",
    method: "getMemberKillHistory",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "memberId",
      },
      {
        source: "caller",
        key: "accessPolicy",
      },
      {
        source: "query",
        key: "limit",
      },
      {
        source: "query",
        key: "cursor",
      },
      {
        source: "query",
        key: "heroId",
      },
      {
        source: "caller",
        key: "roles",
      },
    ],
  },
  EventsRankingControllerGetHeroKillHistory: {
    controller: "EventsRankingController",
    method: "getHeroKillHistory",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "heroId",
      },
      {
        source: "caller",
        key: "accessPolicy",
      },
      {
        source: "query",
        key: "limit",
      },
      {
        source: "query",
        key: "cursor",
      },
      {
        source: "caller",
        key: "roles",
      },
    ],
  },
  EventsRankingControllerGetKillDetail: {
    controller: "EventsRankingController",
    method: "getKillDetail",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "heroId",
      },
      {
        source: "params",
        key: "killId",
      },
      {
        source: "caller",
        key: "roles",
      },
      {
        source: "caller",
        key: "accessPolicy",
      },
    ],
  },
  EventsRankingControllerUpdateKillPoint: {
    controller: "EventsRankingController",
    method: "updateKillPoint",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "eventId",
      },
      {
        source: "params",
        key: "killId",
      },
      {
        source: "params",
        key: "killPointId",
      },
      {
        source: "payload",
      },
      {
        source: "caller",
        key: "userId",
      },
    ],
  },
  NotificationsGuildControllerGetGuildTargets: {
    controller: "NotificationsGuildController",
    method: "getGuildTargets",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
    ],
  },
  NotificationsGuildControllerGetAvailableGuildTargets: {
    controller: "NotificationsGuildController",
    method: "getAvailableGuildTargets",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
    ],
  },
  NotificationsGuildControllerCreateGuildTarget: {
    controller: "NotificationsGuildController",
    method: "createGuildTarget",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "payload",
      },
    ],
  },
  NotificationsGuildControllerUpdateGuildTarget: {
    controller: "NotificationsGuildController",
    method: "updateGuildTarget",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "targetId",
      },
      {
        source: "payload",
      },
    ],
  },
  NotificationsGuildControllerDeleteGuildTarget: {
    controller: "NotificationsGuildController",
    method: "deleteGuildTarget",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "targetId",
      },
    ],
  },
  NotificationsGuildControllerGetGuildRules: {
    controller: "NotificationsGuildController",
    method: "getGuildRules",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
    ],
  },
  NotificationsGuildControllerCreateGuildRule: {
    controller: "NotificationsGuildController",
    method: "createGuildRule",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "payload",
      },
    ],
  },
  NotificationsGuildControllerUpdateGuildRule: {
    controller: "NotificationsGuildController",
    method: "updateGuildRule",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "ruleId",
      },
      {
        source: "payload",
      },
    ],
  },
  NotificationsGuildControllerDeleteGuildRule: {
    controller: "NotificationsGuildController",
    method: "deleteGuildRule",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "ruleId",
      },
    ],
  },
  NotificationsGuildControllerRebuildGuildRuleJobs: {
    controller: "NotificationsGuildController",
    method: "rebuildGuildRuleJobs",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "ruleId",
      },
    ],
  },
  NotificationsGuildControllerTriggerGuildRuleTest: {
    controller: "NotificationsGuildController",
    method: "triggerGuildRuleTest",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "ruleId",
      },
    ],
  },
  NotificationsGuildControllerGetGuildJobs: {
    controller: "NotificationsGuildController",
    method: "getGuildJobs",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
    ],
  },
  NotificationsGuildControllerCancelGuildJob: {
    controller: "NotificationsGuildController",
    method: "cancelGuildJob",
    arguments: [
      {
        source: "caller",
        key: "guild",
      },
      {
        source: "params",
        key: "jobId",
      },
    ],
  },
  NotificationsUserControllerGetUserTargets: {
    controller: "NotificationsUserController",
    method: "getUserTargets",
    arguments: [
      {
        source: "caller",
        key: "discordId",
      },
    ],
  },
  NotificationsUserControllerCreateUserTarget: {
    controller: "NotificationsUserController",
    method: "createUserTarget",
    arguments: [
      {
        source: "caller",
        key: "discordId",
      },
      {
        source: "payload",
      },
    ],
  },
  NotificationsUserControllerUpdateUserTarget: {
    controller: "NotificationsUserController",
    method: "updateUserTarget",
    arguments: [
      {
        source: "caller",
        key: "discordId",
      },
      {
        source: "params",
        key: "targetId",
      },
      {
        source: "payload",
      },
    ],
  },
  NotificationsUserControllerTriggerUserTargetTest: {
    controller: "NotificationsUserController",
    method: "triggerUserTargetTest",
    arguments: [
      {
        source: "caller",
        key: "discordId",
      },
      {
        source: "params",
        key: "targetId",
      },
    ],
  },
  NotificationsUserControllerDeleteUserTarget: {
    controller: "NotificationsUserController",
    method: "deleteUserTarget",
    arguments: [
      {
        source: "caller",
        key: "discordId",
      },
      {
        source: "params",
        key: "targetId",
      },
    ],
  },
  NotificationsUserControllerGetUserRules: {
    controller: "NotificationsUserController",
    method: "getUserRules",
    arguments: [
      {
        source: "caller",
        key: "discordId",
      },
    ],
  },
  NotificationsUserControllerCreateUserRule: {
    controller: "NotificationsUserController",
    method: "createUserRule",
    arguments: [
      {
        source: "caller",
        key: "discordId",
      },
      {
        source: "payload",
      },
    ],
  },
  NotificationsUserControllerUpdateUserRule: {
    controller: "NotificationsUserController",
    method: "updateUserRule",
    arguments: [
      {
        source: "caller",
        key: "discordId",
      },
      {
        source: "params",
        key: "ruleId",
      },
      {
        source: "payload",
      },
    ],
  },
  NotificationsUserControllerDeleteUserRule: {
    controller: "NotificationsUserController",
    method: "deleteUserRule",
    arguments: [
      {
        source: "caller",
        key: "discordId",
      },
      {
        source: "params",
        key: "ruleId",
      },
    ],
  },
  NotificationsUserControllerGetUserJobs: {
    controller: "NotificationsUserController",
    method: "getUserJobs",
    arguments: [
      {
        source: "caller",
        key: "discordId",
      },
    ],
  },
  NotificationsUserControllerGetWatchedItems: {
    controller: "NotificationsUserController",
    method: "getWatchedItems",
    arguments: [
      {
        source: "caller",
        key: "discordId",
      },
    ],
  },
  NotificationsUserControllerCreateWatchedItem: {
    controller: "NotificationsUserController",
    method: "createWatchedItem",
    arguments: [
      {
        source: "caller",
        key: "discordId",
      },
      {
        source: "caller",
        key: "userId",
      },
      {
        source: "payload",
      },
    ],
  },
  NotificationsUserControllerQuickAddWatchedItem: {
    controller: "NotificationsUserController",
    method: "quickAddWatchedItem",
    arguments: [
      {
        source: "caller",
        key: "discordId",
      },
      {
        source: "caller",
        key: "userId",
      },
      {
        source: "payload",
      },
    ],
  },
  NotificationsUserControllerDeleteWatchedItem: {
    controller: "NotificationsUserController",
    method: "deleteWatchedItem",
    arguments: [
      {
        source: "caller",
        key: "discordId",
      },
      {
        source: "params",
        key: "watchedItemId",
      },
    ],
  },
} as const;
