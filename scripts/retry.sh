# Sourced by deployment workflows. Retries a command that fails on a transient
# provider error, such as a Cloudflare API 5xx during a Wrangler upload.
# Standard output is printed only from the attempt that succeeds, so callers
# can parse it; standard error streams from every attempt.
retry() {
  local attempt output
  for attempt in 1 2 3; do
    if output="$("$@")"; then
      [[ -n "$output" ]] && printf '%s\n' "$output"
      return 0
    fi
    if ((attempt < 3)); then
      echo "::warning::Attempt $attempt of 3 failed, retrying in $((attempt * 15))s: $1 ${2:-} ${3:-}" >&2
      sleep $((attempt * 15))
    fi
  done
  echo "::error::Failed after 3 attempts: $1 ${2:-} ${3:-}" >&2
  return 1
}
