/** KEYS: rate-limit key. ARGV: window milliseconds, limit, unique attempt ID. */
export const slidingWindowRateLimitScript = ({
  refreshExpiryOnReject,
  includeTimestamp,
}: {
  readonly refreshExpiryOnReject: boolean;
  readonly includeTimestamp: boolean;
}) => `
local time = redis.call("TIME")
local now = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", now - window)
local count = redis.call("ZCARD", KEYS[1])
if count >= limit then
  local oldest = redis.call("ZRANGE", KEYS[1], 0, 0, "WITHSCORES")
  local retryAfter = math.max(1, tonumber(oldest[2]) + window - now)
  ${refreshExpiryOnReject ? 'redis.call("PEXPIRE", KEYS[1], window)' : ""}
  return {0, ${includeTimestamp ? "now, " : ""}retryAfter}
end
redis.call("ZADD", KEYS[1], now, ARGV[3])
redis.call("PEXPIRE", KEYS[1], window)
return {1, ${includeTimestamp ? "now, " : ""}0}
`;
