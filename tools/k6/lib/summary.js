export function createSummary(data) {
  const checks = data.metrics.checks;
  const duration = data.metrics.http_req_duration;
  const lines = [
    "Lootlog k6 summary",
    `checks rate: ${formatRate(checks?.values?.rate)}`,
    `http p95: ${formatNumber(duration?.values?.["p(95)"])} ms`,
    `http avg: ${formatNumber(duration?.values?.avg)} ms`,
    `requests: ${formatNumber(data.metrics.http_reqs?.values?.count)}`,
    "",
  ];
  const output = {
    stdout: `${lines.join("\n")}\n`,
  };

  if (__ENV.K6_SUMMARY_JSON) {
    output[__ENV.K6_SUMMARY_JSON] = JSON.stringify(data, null, 2);
  }

  return output;
}

function formatRate(value) {
  if (typeof value !== "number") {
    return "n/a";
  }

  return `${(value * 100).toFixed(2)}%`;
}

function formatNumber(value) {
  if (typeof value !== "number") {
    return "n/a";
  }

  return value.toFixed(2);
}
