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
