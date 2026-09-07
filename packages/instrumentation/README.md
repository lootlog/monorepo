# Service observability

The seven backend services share `makeObservabilityLayer`. It installs JSON
stdout logging, parent-based 10% root trace sampling, OTLP metrics and scoped
process measurements. Keep one layer per service process. Promise-based logger
adapters use `installScopedLogRunner` inside that layer's scope to retain service
identity and the current trace context.

Enable `OTEL_METRICS_EXPORTER=otlp` and `OTEL_TRACES_EXPORTER=otlp` with an
`OTEL_EXPORTER_OTLP_ENDPOINT` pointing to the Alloy HTTP receiver on port 4318.
Set `OTEL_METRIC_EXPORT_INTERVAL=10000`. Logs use stdout; this integration does
not add an OTLP log exporter. Set `OTEL_SERVICE_INSTANCE_ID` to the pod UID;
`HOSTNAME`, then `local-<pid>`, are fallbacks. `COMMIT_SHA` supplies the version
unless the service configuration supplies it explicitly.

HTTP servers install both `httpServerRouteMetrics` on routes and
`httpServerMetrics` around the HTTP boundary. Duration is emitted as
`http.server.request.duration` in seconds, including failures and interruptions.
Only matched route templates become labels; unknown paths have no route label.
Healthchecks produce neither request metrics nor access logs. The gateway's
native upgrade boundary records its own status and span once.

Traces retain HTTP method, route and status, but omit full URLs, query strings
and HTTP request/response headers. Trace propagation still uses the incoming
context. Application log messages must never contain credentials or private
payloads; the JSON formatter preserves their content and error details.
The Better Auth adapter omits arbitrary detail arguments because they can contain
OAuth input and database parameters; its message, level and context remain.

Idle processes emit `lootlog.service.up`, RSS and heap usage. CPU utilization
is process CPU time divided by elapsed time; one core is 1. Event-loop delay
measures lateness of a one-second timer, not Node.js ELU or GC pause duration.
Unsupported Node/V8 measurements are not emitted as zero.

The infrastructure repository owns Grafana dashboards, exporter environment
variables, alerts and `docs/runbooks/verify-observability.md`. Deploy and verify
in dev before promoting the same immutable application artifacts to prod.

Gateway `unique_players` counts distinct authenticated Discord accounts with
active game presence across replicas. `game_sessions` counts their separate game
connections with unexpired presence; multiple characters or browsers on one
Discord account increase sessions but not players. Web-only connections do not
increase either counter. `connections` includes all registered sockets.
