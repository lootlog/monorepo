export const CREATE_READY_ROOM_SCRIPT = `
local organizerRoomId = redis.call("get", KEYS[2])
if organizerRoomId then
  if redis.call("get", ARGV[1] .. organizerRoomId) then
    return { "ACTIVE_ROOM_EXISTS", organizerRoomId }
  end
  redis.call("del", KEYS[2])
end

local characterRoomId = redis.call("get", KEYS[3])
if characterRoomId then
  if redis.call("get", ARGV[1] .. characterRoomId) then
    return { "JOINED_ELSEWHERE", characterRoomId }
  end
  redis.call("del", KEYS[3])
end

if redis.call("get", KEYS[1]) then
  return { "ROOM_EXISTS" }
end

redis.call("set", KEYS[1], ARGV[2], "EX", ARGV[4])
redis.call("set", KEYS[2], ARGV[3], "EX", ARGV[4])
redis.call("set", KEYS[3], ARGV[3], "EX", ARGV[4])

return { "CREATED" }
`;

export const JOIN_READY_ROOM_SCRIPT = `
local currentAggregate = redis.call("get", KEYS[1])
if not currentAggregate then
  return { "MISSING" }
end

if currentAggregate ~= ARGV[1] then
  return { "CONFLICT" }
end

local characterRoomId = redis.call("get", KEYS[3])
if characterRoomId and characterRoomId ~= ARGV[3] then
  if redis.call("get", ARGV[6] .. characterRoomId) then
    return { "JOINED_ELSEWHERE", characterRoomId }
  end
  redis.call("del", KEYS[3])
end

redis.call("set", KEYS[1], ARGV[2], "EX", ARGV[5])
redis.call("zadd", KEYS[2], ARGV[4], ARGV[3])
local userIndexTtl = redis.call("ttl", KEYS[2])
if userIndexTtl < tonumber(ARGV[5]) then
  redis.call("expire", KEYS[2], ARGV[5])
end
redis.call("set", KEYS[3], ARGV[3], "EX", ARGV[5])

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
if ARGV[5] == "0" then
  redis.call("zrem", KEYS[2], ARGV[3])
end

local characterRoomId = redis.call("get", KEYS[3])
if characterRoomId == ARGV[3] then
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

local organizerCharacterRoomId = redis.call("get", KEYS[3])
if organizerCharacterRoomId == ARGV[3] then
  redis.call("del", KEYS[3])
end

for keyIndex = 4, #KEYS, 2 do
  redis.call("zrem", KEYS[keyIndex], ARGV[3])
  local participantCharacterRoomId = redis.call("get", KEYS[keyIndex + 1])
  if participantCharacterRoomId == ARGV[3] then
    redis.call("del", KEYS[keyIndex + 1])
  end
end

return { "COMMITTED" }
`;

export const FIND_READY_ROOM_IDS_SCRIPT = `
redis.call("zremrangebyscore", KEYS[2], "-inf", ARGV[1])

local roomIds = {}
local organizerRoomId = redis.call("get", KEYS[1])
if organizerRoomId then
  table.insert(roomIds, organizerRoomId)
end

local userRoomIds = redis.call("zrange", KEYS[2], 0, -1)
for _, userRoomId in ipairs(userRoomIds) do
  table.insert(roomIds, userRoomId)
end

return roomIds
`;

export const PRUNE_READY_ROOM_USER_INDEX_SCRIPT = `
for _, notificationId in ipairs(ARGV) do
  redis.call("zrem", KEYS[1], notificationId)
end

return { "PRUNED" }
`;
