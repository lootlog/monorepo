ALTER TABLE "Event"
ADD COLUMN "scoringRules" JSONB,
ADD COLUMN "rulebookMarkdown" TEXT;

UPDATE "Event"
SET "scoringRules" = jsonb_build_object(
  'baseThresholds',
  jsonb_build_array(
    jsonb_build_object('percentage', 75, 'points', 1),
    jsonb_build_object('percentage', 50, 'points', 0.5),
    jsonb_build_object('percentage', 25, 'points', 0.25)
  ),
  'leaveGraceMinutes',
  10,
  'groupBonus',
  jsonb_build_object(
    'minAssignedMembers',
    1,
    'maxAssignedMembers',
    4,
    'points',
    0.5
  ),
  'nightBonus',
  jsonb_build_object(
    'windowStart',
    '03:00',
    'windowEnd',
    '08:00',
    'requiredCoveragePercentage',
    75,
    'points',
    0.5
  ),
  'pvpBonus',
  jsonb_build_object(
    'windowStart',
    '08:00',
    'windowEnd',
    '11:00',
    'points',
    0.5
  ),
  'hardCapPoints',
  2,
  'timezone',
  'Europe/Warsaw'
)
WHERE "scoringRules" IS NULL;

ALTER TABLE "Event"
ALTER COLUMN "scoringRules" SET NOT NULL,
ALTER COLUMN "scoringRules" SET DEFAULT '{"baseThresholds":[{"percentage":75,"points":1},{"percentage":50,"points":0.5},{"percentage":25,"points":0.25}],"leaveGraceMinutes":10,"groupBonus":{"minAssignedMembers":1,"maxAssignedMembers":4,"points":0.5},"nightBonus":{"windowStart":"03:00","windowEnd":"08:00","requiredCoveragePercentage":75,"points":0.5},"pvpBonus":{"windowStart":"08:00","windowEnd":"11:00","points":0.5},"hardCapPoints":2,"timezone":"Europe/Warsaw"}'::jsonb;
