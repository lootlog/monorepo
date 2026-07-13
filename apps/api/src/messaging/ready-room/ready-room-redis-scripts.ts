export const CREATE_READY_ROOM_SCRIPT = `
local currentOrganizerRoomId = redis.call("get", KEYS[2])

if currentOrganizerRoomId then
  if ARGV[3] == "" or currentOrganizerRoomId ~= ARGV[3] then
    return { "ACTIVE_ROOM_EXISTS", currentOrganizerRoomId }
  end

  if redis.call("get", KEYS[3]) then
    return { "ACTIVE_ROOM_EXISTS", currentOrganizerRoomId }
  end

  redis.call("del", KEYS[2])
end

if redis.call("get", KEYS[1]) then
  return { "ROOM_EXISTS" }
end

redis.call("set", KEYS[1], ARGV[1], "EX", ARGV[4])
redis.call("set", KEYS[2], ARGV[2], "EX", ARGV[4])

return { "CREATED" }
`;

export const SAVE_READY_ROOM_APPLICATION_SCRIPT = `
local currentAggregate = redis.call("get", KEYS[1])

if not currentAggregate then
  return { "MISSING" }
end

if currentAggregate ~= ARGV[1] then
  return { "CONFLICT" }
end

redis.call("set", KEYS[1], ARGV[2], "EX", ARGV[5])
redis.call("zadd", KEYS[2], ARGV[3], ARGV[4])

local pendingIndexTtl = redis.call("ttl", KEYS[2])
if pendingIndexTtl < tonumber(ARGV[5]) then
  redis.call("expire", KEYS[2], ARGV[5])
end

return { "COMMITTED" }
`;

export const ACCEPT_READY_ROOM_PARTICIPANT_SCRIPT = `
local currentAggregate = redis.call("get", KEYS[1])

if not currentAggregate then
  return { "MISSING" }
end

if currentAggregate ~= ARGV[1] then
  return { "CONFLICT" }
end

local acceptedRoomId = redis.call("get", KEYS[3])
if acceptedRoomId and acceptedRoomId ~= ARGV[3] then
  return { "ACCEPTED_ELSEWHERE", acceptedRoomId }
end

redis.call("set", KEYS[1], ARGV[2], "EX", ARGV[4])
redis.call("zrem", KEYS[2], ARGV[3])
redis.call("set", KEYS[3], ARGV[3], "EX", ARGV[4])

return { "COMMITTED" }
`;

export const COMMIT_READY_ROOM_SCRIPT = `
local currentAggregate = redis.call("get", KEYS[1])

if not currentAggregate then
  return { "MISSING" }
end

if currentAggregate ~= ARGV[1] then
  return { "CONFLICT" }
end

redis.call("set", KEYS[1], ARGV[2], "EX", ARGV[3])

return { "COMMITTED" }
`;

export const EXIT_READY_ROOM_PARTICIPANT_SCRIPT = `
local currentAggregate = redis.call("get", KEYS[1])

if not currentAggregate then
  return { "MISSING" }
end

if currentAggregate ~= ARGV[1] then
  return { "CONFLICT" }
end

redis.call("set", KEYS[1], ARGV[2], "EX", ARGV[4])
redis.call("zrem", KEYS[2], ARGV[3])

local acceptedRoomId = redis.call("get", KEYS[3])
if acceptedRoomId == ARGV[3] then
  redis.call("del", KEYS[3])
end

return { "COMMITTED" }
`;

export const TERMINATE_READY_ROOM_SCRIPT = `
local currentAggregate = redis.call("get", KEYS[1])

if not currentAggregate then
  return { "MISSING" }
end

if currentAggregate ~= ARGV[1] then
  return { "CONFLICT" }
end

redis.call("set", KEYS[1], ARGV[2], "EX", ARGV[4])

local organizerRoomId = redis.call("get", KEYS[2])
if organizerRoomId == ARGV[3] then
  redis.call("del", KEYS[2])
end

for keyIndex = 3, #KEYS, 2 do
  redis.call("zrem", KEYS[keyIndex], ARGV[3])
  local acceptedRoomId = redis.call("get", KEYS[keyIndex + 1])
  if acceptedRoomId == ARGV[3] then
    redis.call("del", KEYS[keyIndex + 1])
  end
end

return { "COMMITTED" }
`;

export const FIND_READY_ROOM_IDS_SCRIPT = `
redis.call("zremrangebyscore", KEYS[3], "-inf", ARGV[1])

local roomIds = {}
local organizerRoomId = redis.call("get", KEYS[1])
if organizerRoomId then
  table.insert(roomIds, organizerRoomId)
end

local acceptedRoomId = redis.call("get", KEYS[2])
if acceptedRoomId then
  table.insert(roomIds, acceptedRoomId)
end

local pendingRoomIds = redis.call("zrange", KEYS[3], 0, -1)
for _, pendingRoomId in ipairs(pendingRoomIds) do
  table.insert(roomIds, pendingRoomId)
end

return roomIds
`;

export const PRUNE_READY_ROOM_PENDING_SCRIPT = `
for _, notificationId in ipairs(ARGV) do
  redis.call("zrem", KEYS[1], notificationId)
end

return { "PRUNED" }
`;
