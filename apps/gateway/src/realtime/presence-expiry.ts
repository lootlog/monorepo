export const EXPIRY_DUE_INDEX = "presence:expiry:due";

export const EXPIRY_SWEEP_LOCK = "presence:expiry:sweep-lock";

export const EXPIRY_BATCH_SIZE = 100;

export const EXPIRY_LEASE_MS = 30_000;

export const READ_EXPIRY_ORGANIZATION = `
-- presence:expiry-organization
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return '' end
local current = redis.call('GET', KEYS[5])
if current then return current end
if redis.call('LLEN', KEYS[4]) == 0 then
  local page = redis.call('SSCAN', KEYS[2], redis.call('GET', KEYS[3]) or '0', 'COUNT', ARGV[2])
  redis.call('SET', KEYS[3], page[1])
  for _, organization in ipairs(page[2]) do redis.call('RPUSH', KEYS[4], organization) end
end
local organization = redis.call('LPOP', KEYS[4])
if not organization then return '' end
redis.call('SET', KEYS[5], organization)
return organization
`;

// SSCAN COUNT is only a hint. Persist overflow before returning a bounded page,
// and inspect scores instead of fetching active payloads on reconciliation.
export const READ_EXPIRY_LEGACY_BATCH = `
-- presence:expiry-legacy-batch
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return '{"keys":[],"complete":false}' end
local members = redis.call('LRANGE', KEYS[4], 0, tonumber(ARGV[2]) - 1)
if #members > 0 then
  redis.call('LTRIM', KEYS[4], #members, -1)
else
  local page = redis.call('SSCAN', KEYS[2], redis.call('GET', KEYS[3]) or '0', 'COUNT', ARGV[2])
  redis.call('SET', KEYS[3], page[1])
  members = page[2]
end
local result = {}
for index, member in ipairs(members) do
  if index > tonumber(ARGV[2]) then redis.call('RPUSH', KEYS[4], member)
  else
    local session = string.match(member, '[^:]+$')
    local candidate = cjson.encode({ARGV[3], session})
    if not redis.call('ZSCORE', KEYS[5], candidate) then table.insert(result, member) end
  end
end
local complete = (redis.call('GET', KEYS[3]) or '0') == '0' and redis.call('LLEN', KEYS[4]) == 0
if complete then redis.call('DEL', KEYS[3], KEYS[4], KEYS[6]) end
return '{"keys":' .. (#result == 0 and '[]' or cjson.encode(result)) .. ',"complete":' .. tostring(complete) .. '}'
`;

// Both observations must still match: legacy writers do not maintain the due
// queue, and either payload or metadata may have been evicted independently.
export const INDEX_EXPIRY_DUE = `
-- presence:expiry-index
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
for key = 3, #KEYS, 2 do
  local arg = 2 + ((key - 3) / 2) * 4
  if (redis.call('GET', KEYS[key]) or '') == ARGV[arg]
      and (redis.call('GET', KEYS[key + 1]) or '') == ARGV[arg + 1] then
    redis.call('ZADD', KEYS[2], ARGV[arg + 3], ARGV[arg + 2])
  end
end
return 1
`;

export const READ_EXPIRY_READY = `
-- presence:expiry-ready
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return '[]' end
redis.call('PEXPIRE', KEYS[1], ARGV[2])
local members = redis.call('ZRANGEBYSCORE', KEYS[2], '-inf', ARGV[3], 'LIMIT', 0, ARGV[4])
if #members == 0 then return '[]' end
return cjson.encode(members)
`;

export const REMOVE_EXPIRED_PRESENCE = `
-- presence:expiry-remove
if redis.call('GET', KEYS[1]) ~= ARGV[1] or redis.call('GET', KEYS[6]) ~= ARGV[1] then return 0 end
redis.call('PEXPIRE', KEYS[1], ARGV[7])
redis.call('PEXPIRE', KEYS[6], ARGV[7])
local due = redis.call('ZSCORE', KEYS[5], ARGV[4])
if not due or tonumber(due) > tonumber(ARGV[5]) then return 0 end
if (redis.call('GET', KEYS[2]) or '') ~= ARGV[2]
    or (redis.call('GET', KEYS[3]) or '') ~= ARGV[3] then return 0 end
if #KEYS > 6 then
  if redis.call('SCARD', KEYS[9]) ~= #KEYS - 10 then return 0 end
  for key = 11, #KEYS do
    if (redis.call('GET', KEYS[key]) or '') ~= ARGV[key]
        or redis.call('SISMEMBER', KEYS[9], ARGV[key + #KEYS - 10]) == 0 then return 0 end
  end
  for key = 11, #KEYS do
    local member = ARGV[key + #KEYS - 10]
    redis.call('DEL', KEYS[key])
    redis.call('SREM', KEYS[8], member)
    redis.call('SREM', KEYS[9], member)
    redis.call('ZREM', KEYS[10], member)
  end
  redis.call('SET', KEYS[7], ARGV[8])
  redis.call('SADD', KEYS[8], ARGV[9])
  redis.call('SADD', KEYS[9], ARGV[9])
  redis.call('ZADD', KEYS[10], ARGV[10], ARGV[9])
end
redis.call('DEL', KEYS[2], KEYS[3])
redis.call('SREM', KEYS[4], ARGV[6])
redis.call('ZREM', KEYS[5], ARGV[4])
return 1
`;

export const REMOVE_PRESENCE = `
-- presence:remove
redis.call('DEL', KEYS[1], KEYS[2])
redis.call('SREM', KEYS[3], ARGV[1])
redis.call('ZREM', KEYS[4], ARGV[2])
return 1
`;
